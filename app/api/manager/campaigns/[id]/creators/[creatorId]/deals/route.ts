import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isAssignedDealInput, assignedDealDateError, todayDate, type Deal } from "@/lib/deals";

const NOT_FOUND = { error: "Campaign not found." } as const;

// Assigning a deal requires the creator to already be on this campaign (added via the
// Creators & Deals picker) and linked to a real account — deals.user_id must point at a
// real app_users row, so there's nowhere to attach a deal for an unlinked contact yet.
async function getAuthorizedAssignment(campaignId: string, creatorId: string) {
  const supabase = getSupabaseAdmin();
  const { data: campaign } = await supabase.from("campaigns").select("id, workspaceId, brand").eq("id", campaignId).maybeSingle();
  if (!campaign) return null;
  const access = await requireWorkspaceAccess(campaign.workspaceId);
  if (!access) return null;

  const { data: creator } = await supabase.from("creators").select("id, linkedUserId").eq("id", creatorId).eq("workspaceId", campaign.workspaceId).maybeSingle();
  if (!creator) return null;

  const { data: membership } = await supabase.from("campaign_creators").select("id").eq("campaignId", campaignId).eq("creatorId", creatorId).maybeSingle();
  if (!membership) return null;

  return { campaign, access, creator, supabase };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const { id, creatorId } = await params;
  const authorized = await getAuthorizedAssignment(id, creatorId);
  if (!authorized) return NextResponse.json(NOT_FOUND, { status: 404 });
  const { campaign, access, creator, supabase } = authorized;

  if (!creator.linkedUserId) return NextResponse.json({ error: "Link this creator to their account before assigning a deal." }, { status: 400 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!isAssignedDealInput(body)) return NextResponse.json({ error: "Invalid deal data." }, { status: 400 });
  const dateError = assignedDealDateError(body);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  // The brand and deal date aren't manager-editable — brand always matches the campaign's
  // brand, and the deal date is always the day the assignment was made.
  const dealFields = {
    brand: campaign.brand,
    amount: body.amount,
    dealDate: todayDate(),
    dueDate: body.dueDate,
    deliverables: body.deliverables ?? [],
    notes: body.notes ?? null,
    contentCreated: false,
    sentToBrand: false,
    posted: false,
    moneyReceived: false,
    workspaceId: campaign.workspaceId,
    campaignId: campaign.id,
    assignedByUserId: access.sub,
    acceptanceStatus: "pending" as const,
    user_id: creator.linkedUserId,
  };

  // One assigned deal per campaign/creator pair — re-submitting the form edits the existing
  // deal instead of creating a second one for the same assignment.
  const { data: existing } = await supabase.from("deals").select("id").eq("campaignId", id).eq("user_id", creator.linkedUserId).maybeSingle();
  const query = existing
    ? supabase.from("deals").update(dealFields).eq("id", existing.id).select().single()
    : supabase.from("deals").insert(dealFields).select().single();
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data as Deal });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const { id, creatorId } = await params;
  const authorized = await getAuthorizedAssignment(id, creatorId);
  if (!authorized) return NextResponse.json(NOT_FOUND, { status: 404 });
  const { creator, supabase } = authorized;
  if (!creator.linkedUserId) return NextResponse.json({ error: "No deal to remove." }, { status: 400 });

  const { data, error } = await supabase.from("deals").delete().eq("campaignId", id).eq("user_id", creator.linkedUserId).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length !== 1) return NextResponse.json({ error: "No deal found for this creator on this campaign." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
