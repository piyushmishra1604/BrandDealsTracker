import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  MANAGED_REQUIRES_LINK_MESSAGE,
  MANAGED_REQUIRES_RESTORE_MESSAGE,
  isCreatorRelationship,
  type Creator,
} from "@/lib/creators";

const NOT_FOUND = { error: "Creator not found." } as const;

// Any manager in the workspace can change a creator's relationship. Demoting to external keeps
// every deal, because deals reference the creator row and nothing is removed.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { relationship } = (body ?? {}) as { relationship?: unknown };
  if (!isCreatorRelationship(relationship)) return NextResponse.json({ error: "Choose either managed or external." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: creator } = await supabase.from("creators").select("*").eq("id", id).maybeSingle();
  if (!creator) return NextResponse.json(NOT_FOUND, { status: 404 });

  const access = await requireWorkspaceAccess(creator.workspaceId);
  if (!access) return NextResponse.json(NOT_FOUND, { status: 404 });

  if (creator.relationship === relationship) return NextResponse.json({ creator: creator as Creator });

  if (relationship === "managed") {
    if (!creator.linkedUserId) return NextResponse.json({ error: MANAGED_REQUIRES_LINK_MESSAGE }, { status: 400 });
    if (creator.archivedAt) return NextResponse.json({ error: MANAGED_REQUIRES_RESTORE_MESSAGE }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("creators")
    .update({ relationship })
    .eq("id", id)
    .select()
    .single();
  // The database check managed_creator_is_linked is the backstop if the rules above are bypassed.
  if (error) {
    if (error.code === "23514") return NextResponse.json({ error: MANAGED_REQUIRES_LINK_MESSAGE }, { status: 400 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ creator: data as Creator });
}
