import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type Creator } from "@/lib/creators";

const NOT_FOUND = { error: "Creator not found." } as const;

// Confirms linking a creator contact to a real, registered creator account. This is
// the temporary stand-in for WP4.4 (real invitations come last): the manager must
// already know the account's email (via lookup-account) and explicitly confirm here —
// no email is sent and the creator isn't asked to accept anything yet.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { accountId } = (body ?? {}) as { accountId?: unknown };
  if (typeof accountId !== "string" || !accountId) return NextResponse.json({ error: "Missing account to link." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: creator } = await supabase.from("creators").select("*").eq("id", id).maybeSingle();
  if (!creator) return NextResponse.json(NOT_FOUND, { status: 404 });

  const access = await requireWorkspaceAccess(creator.workspaceId);
  if (!access) return NextResponse.json(NOT_FOUND, { status: 404 });

  // Re-verify server-side that this is really a creator account — never trust the
  // client's earlier lookup result on its own.
  const { data: account } = await supabase.from("app_users").select("id").eq("id", accountId).eq("account_type", "creator").maybeSingle();
  if (!account) return NextResponse.json({ error: "That account no longer exists or isn't a creator account." }, { status: 400 });

  const { data: alreadyLinked } = await supabase
    .from("creators")
    .select("id, name")
    .eq("workspaceId", creator.workspaceId)
    .eq("linkedUserId", accountId)
    .neq("id", id)
    .maybeSingle();
  if (alreadyLinked) return NextResponse.json({ error: `This account is already linked to "${alreadyLinked.name}" in your workspace.` }, { status: 409 });

  const { data, error } = await supabase
    .from("creators")
    .update({ linkedUserId: accountId, status: "linked" })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creator: data as Creator });
}
