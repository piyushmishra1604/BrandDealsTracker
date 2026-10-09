import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isCreatorInput, type Creator } from "@/lib/creators";

// Same message whether the creator doesn't exist or this manager can't access its
// workspace, so a guessed id never reveals whether a creator exists elsewhere.
const NOT_FOUND = { error: "Creator not found." } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: creator } = await getSupabaseAdmin().from("creators").select("*").eq("id", id).maybeSingle();
  if (!creator) return NextResponse.json(NOT_FOUND, { status: 404 });

  const access = await requireWorkspaceAccess(creator.workspaceId);
  if (!access) return NextResponse.json(NOT_FOUND, { status: 404 });

  return NextResponse.json({ creator: creator as Creator });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let updates: unknown;
  try { updates = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!updates || typeof updates !== "object") return NextResponse.json({ error: "Invalid creator data." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("creators").select("*").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json(NOT_FOUND, { status: 404 });

  const access = await requireWorkspaceAccess(existing.workspaceId);
  if (!access) return NextResponse.json(NOT_FOUND, { status: 404 });

  const merged = { ...existing, ...(updates as Record<string, unknown>) };
  if (!isCreatorInput(merged)) return NextResponse.json({ error: "Invalid creator data." }, { status: 400 });

  const { data, error } = await supabase
    .from("creators")
    .update({
      name: merged.name, email: merged.email || null, phone: merged.phone || null,
      instagramHandle: merged.instagramHandle || null, category: merged.category || null, notes: merged.notes || null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creator: data as Creator });
}
