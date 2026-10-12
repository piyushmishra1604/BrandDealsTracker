import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type Creator } from "@/lib/creators";

const NOT_FOUND = { error: "Creator not found." } as const;

// Archiving hides a creator from the directory and keeps their deal history. Creators are
// never hard-deleted, because deals reference them.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { archived } = (body ?? {}) as { archived?: unknown };
  if (typeof archived !== "boolean") return NextResponse.json({ error: "Specify whether to archive or restore." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: creator } = await supabase.from("creators").select("id, workspaceId").eq("id", id).maybeSingle();
  if (!creator) return NextResponse.json(NOT_FOUND, { status: 404 });

  const access = await requireWorkspaceAccess(creator.workspaceId);
  if (!access) return NextResponse.json(NOT_FOUND, { status: 404 });

  const { data, error } = await supabase
    .from("creators")
    .update({ archivedAt: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creator: data as Creator });
}
