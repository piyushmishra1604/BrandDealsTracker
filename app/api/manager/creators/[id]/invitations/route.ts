import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MANAGED_REQUIRES_RESTORE_MESSAGE } from "@/lib/creators";
import {
  buildInvitationUrl,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  isInvitationExpired,
} from "@/lib/creator-invitations";

const NOT_FOUND = { error: "Creator not found." } as const;

type Params = { params: Promise<{ id: string }> };

async function loadAccessibleCreator(id: string) {
  const supabase = getSupabaseAdmin();
  const { data: creator } = await supabase.from("creators").select("*").eq("id", id).maybeSingle();
  if (!creator) return { creator: null, access: null };
  const access = await requireWorkspaceAccess(creator.workspaceId);
  if (!access) return { creator: null, access: null };
  return { creator, access };
}

// Reports the live invitation without ever returning its token, so reloading the page can't leak the link.
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const { creator } = await loadAccessibleCreator(id);
  if (!creator) return NextResponse.json(NOT_FOUND, { status: 404 });

  const { data, error } = await getSupabaseAdmin()
    .from("creator_invitations")
    .select("id, email, status, expiresAt, created_at")
    .eq("creatorId", id)
    .eq("status", "pending")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ invitation: null });

  const expired = isInvitationExpired(data.expiresAt, new Date());
  return NextResponse.json({
    invitation: { id: data.id, email: data.email, status: expired ? "expired" : "pending", expiresAt: data.expiresAt, createdAt: data.created_at },
  });
}

// Issuing a new link revokes any earlier pending one, so only the newest link works.
// The raw token is returned exactly once; only its hash is stored.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { creator, access } = await loadAccessibleCreator(id);
  if (!creator || !access) return NextResponse.json(NOT_FOUND, { status: 404 });

  if (creator.archivedAt) return NextResponse.json({ error: MANAGED_REQUIRES_RESTORE_MESSAGE }, { status: 400 });
  if (creator.linkedUserId || creator.status === "linked") {
    return NextResponse.json({ error: "This creator is already linked to an account." }, { status: 400 });
  }
  const email = typeof creator.email === "string" ? creator.email.trim() : "";
  if (!email) return NextResponse.json({ error: "Add an email address to this creator before inviting them." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error: revokeError } = await supabase
    .from("creator_invitations")
    .update({ status: "revoked" })
    .eq("creatorId", id)
    .eq("status", "pending");
  if (revokeError) return NextResponse.json({ error: revokeError.message }, { status: 500 });

  const token = generateInvitationToken();
  const { data, error } = await supabase
    .from("creator_invitations")
    .insert({
      workspaceId: creator.workspaceId,
      creatorId: id,
      email,
      tokenHash: hashInvitationToken(token),
      expiresAt: invitationExpiresAt(new Date()),
      createdByUserId: access.sub,
    })
    .select("id, email, status, expiresAt, created_at")
    .single();
  if (error) {
    // The partial unique index rejects a second pending link if two managers issue at once.
    if (error.code === "23505") return NextResponse.json({ error: "Another invitation was just issued for this creator. Refresh and try again." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = buildInvitationUrl(new URL(request.url).origin, token);
  return NextResponse.json({
    invitation: { id: data.id, email: data.email, status: data.status, expiresAt: data.expiresAt, createdAt: data.created_at },
    url,
  }, { status: 201 });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const { creator } = await loadAccessibleCreator(id);
  if (!creator) return NextResponse.json(NOT_FOUND, { status: 404 });

  const { data, error } = await getSupabaseAdmin()
    .from("creator_invitations")
    .update({ status: "revoked" })
    .eq("creatorId", id)
    .eq("status", "pending")
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "There is no pending invitation to cancel." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
