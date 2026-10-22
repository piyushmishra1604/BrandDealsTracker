import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { activateManualDeals } from "@/lib/manual-deals";
import { emailsMatch, hashInvitationToken, isInvitationExpired } from "@/lib/creator-invitations";

// Only a signed-in creator account whose email matches the invitation can accept it. The claim
// below is conditional on the invitation still being pending, so a double-submit or two tabs
// racing can't link the contact twice.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in with your creator account to accept this invitation." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { token } = (body ?? {}) as { token?: unknown };
  if (typeof token !== "string" || !token) return NextResponse.json({ error: "This invitation link is incomplete." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: account } = await supabase.from("app_users").select("id, email, account_types").eq("id", user.sub).maybeSingle();
  if (!account || !account.account_types?.includes("creator")) return NextResponse.json({ error: "Only creator accounts can accept invitations." }, { status: 403 });

  const { data: invitation } = await supabase
    .from("creator_invitations")
    .select("id, creatorId, email, status, expiresAt, acceptedByUserId")
    .eq("tokenHash", hashInvitationToken(token))
    .maybeSingle();
  if (!invitation) return NextResponse.json({ error: "This invitation link is not valid." }, { status: 404 });

  if (invitation.status === "accepted") {
    if (invitation.acceptedByUserId !== account.id) return NextResponse.json({ error: "This invitation has already been used." }, { status: 409 });
    // Same account retrying after the link succeeded but deal conversion failed: only the conversion is retried.
    const retried = await activateManualDeals(supabase, { creatorId: invitation.creatorId, linkedUserId: account.id });
    if (!retried.ok) return NextResponse.json({ error: `You're linked, but your deals could not be activated yet: ${retried.error}` }, { status: retried.status });
    return NextResponse.json({ ok: true });
  }
  if (invitation.status === "revoked") return NextResponse.json({ error: "This invitation was cancelled. Ask the manager for a new link." }, { status: 410 });

  const now = new Date();
  if (invitation.status === "expired" || isInvitationExpired(invitation.expiresAt, now)) {
    if (invitation.status === "pending") {
      await supabase.from("creator_invitations").update({ status: "expired" }).eq("id", invitation.id).eq("status", "pending");
    }
    return NextResponse.json({ error: "This invitation has expired. Ask the manager for a new link." }, { status: 410 });
  }

  if (!emailsMatch(account.email, invitation.email)) {
    return NextResponse.json({ error: "This invitation was sent to a different email address. Sign in with that account to accept it." }, { status: 403 });
  }

  const { data: creator } = await supabase
    .from("creators")
    .select("id, workspaceId, linkedUserId, archivedAt")
    .eq("id", invitation.creatorId)
    .maybeSingle();
  if (!creator || creator.archivedAt) return NextResponse.json({ error: "This invitation is no longer valid." }, { status: 410 });
  if (creator.linkedUserId && creator.linkedUserId !== account.id) {
    return NextResponse.json({ error: "This contact is already linked to another account." }, { status: 409 });
  }

  // Generic on purpose: this response goes to the invitee, not the manager, so it doesn't name another contact.
  const { data: alreadyLinked } = await supabase
    .from("creators")
    .select("id")
    .eq("workspaceId", creator.workspaceId)
    .eq("linkedUserId", account.id)
    .neq("id", creator.id)
    .maybeSingle();
  if (alreadyLinked) return NextResponse.json({ error: "Your account is already linked to another contact in this workspace." }, { status: 409 });

  const { data: claimed, error: claimError } = await supabase
    .from("creator_invitations")
    .update({ status: "accepted", acceptedAt: now.toISOString(), acceptedByUserId: account.id })
    .eq("id", invitation.id)
    .eq("status", "pending")
    .select("id");
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  if (!claimed || claimed.length === 0) return NextResponse.json({ error: "This invitation has already been used or cancelled." }, { status: 409 });

  const { error: linkError } = await supabase
    .from("creators")
    .update({ linkedUserId: account.id, status: "linked" })
    .eq("id", creator.id);
  if (linkError) {
    // Release the claim so the creator can retry; the link never happened.
    await supabase
      .from("creator_invitations")
      .update({ status: "pending", acceptedAt: null, acceptedByUserId: null })
      .eq("id", invitation.id)
      .eq("acceptedByUserId", account.id);
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  // Activation runs after the link. If it fails, the same account can retry the link to finish it (see the accepted branch above).
  const activated = await activateManualDeals(supabase, { creatorId: creator.id, linkedUserId: account.id });
  if (!activated.ok) return NextResponse.json({ error: `You're linked, but your deals could not be activated yet: ${activated.error}` }, { status: activated.status });
  return NextResponse.json({ ok: true });
}
