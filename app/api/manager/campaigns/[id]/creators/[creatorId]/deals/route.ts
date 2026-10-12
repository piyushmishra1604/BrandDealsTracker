import { NextResponse } from "next/server";
import { isAssignedDealInput, isDeliverables, assignedDealDateError, todayDate, type Deal } from "@/lib/deals";
import { managerAssignedFields, managerOfferTransition, isNegotiationNote, type ManagerAssignmentInput } from "@/lib/assigned-deals";
import {
  getAuthorizedAssignment, findCampaignCreatorDeal, applyDealChange, type Supabase,
} from "@/lib/assigned-deal-store";
import { notifyDealAssigned } from "@/lib/notification-store";

const NOT_FOUND = { error: "Campaign not found." } as const;

// Linked creators get a pending deal and a notification. Unlinked creators get a manual deal
// that is recorded off-platform and has no owner until the creator is linked.
export async function POST(request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const { id, creatorId } = await params;
  const authorized = await getAuthorizedAssignment(id, creatorId);
  if (!authorized) return NextResponse.json(NOT_FOUND, { status: 404 });
  const { campaign, access, creator, supabase } = authorized;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!isAssignedDealInput(body)) return NextResponse.json({ error: "Invalid deal data." }, { status: 400 });
  const dateError = assignedDealDateError(body);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const note = (body as { note?: unknown }).note;
  if (note !== undefined && note !== null && !isNegotiationNote(note)) {
    return NextResponse.json({ error: "The note must be 500 characters or fewer." }, { status: 400 });
  }
  const offerNote = typeof note === "string" ? note : "";

  const existingResult = await findCampaignCreatorDeal(supabase, id, creator.id);
  if (!existingResult.ok) return NextResponse.json({ error: existingResult.error }, { status: existingResult.status });
  const existing = existingResult.value;

  if (!existing) {
    return createAssignedDeal({
      supabase, campaign, managerUserId: access.sub, campaignId: id, creatorProfileId: creator.id, linkedUserId: creator.linkedUserId ?? null, input: body, offerNote,
    });
  }

  const currentStatus = existing.acceptanceStatus ?? "pending";
  const transition = managerOfferTransition({ status: currentStatus, amountChanged: existing.amount !== body.amount });
  if (!transition.ok) return NextResponse.json({ error: transition.error }, { status: transition.httpStatus });

  const result = await applyDealChange(supabase, {
    dealId: existing.id,
    expectedStatus: currentStatus,
    patch: { ...managerAssignedFields(existing, body, campaign.brand), acceptanceStatus: transition.status },
    actor: transition.event ? "manager" : null,
    event: transition.event,
    note: offerNote,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deal: result.value });
}

async function createAssignedDeal(input: {
  supabase: Supabase;
  campaign: { workspaceId: string; brand: string };
  managerUserId: string;
  campaignId: string;
  creatorProfileId: string;
  linkedUserId: string | null;
  input: ManagerAssignmentInput;
  offerNote: string;
}) {
  const { supabase, campaign, managerUserId, campaignId, creatorProfileId, linkedUserId, offerNote } = input;
  const isLinked = linkedUserId !== null;
  const { data, error } = await supabase.from("deals").insert({
    ...managerAssignedFields(null, input.input, campaign.brand),
    dealDate: todayDate(),
    contentCreated: false,
    sentToBrand: false,
    posted: false,
    moneyReceived: false,
    workspaceId: campaign.workspaceId,
    campaignId,
    creatorId: creatorProfileId,
    assignedByUserId: managerUserId,
    acceptanceStatus: isLinked ? "pending" : "manual",
    user_id: linkedUserId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const deal = data as Deal;

  if (!isLinked) return NextResponse.json({ deal });

  // The first offer goes into the history table. If that fails, remove the deal so the
  // manager can retry instead of being left with a pending deal that has no offer on record.
  const { error: offerError } = await supabase.from("deal_offers").insert({
    dealId: deal.id, actor: "manager", event: "offer", amount: deal.amount, note: offerNote,
  });
  if (offerError) {
    await supabase.from("deals").delete().eq("id", deal.id);
    return NextResponse.json({ error: offerError.message }, { status: 500 });
  }
  await notifyDealAssigned(supabase, { userId: linkedUserId, workspaceId: campaign.workspaceId, dealId: deal.id });
  return NextResponse.json({ deal });
}

// Manager edits the deliverable list (add, remove, or tick done). The offer status and amount are unchanged.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const { id, creatorId } = await params;
  const authorized = await getAuthorizedAssignment(id, creatorId);
  if (!authorized) return NextResponse.json(NOT_FOUND, { status: 404 });
  const { supabase, creator } = authorized;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const deliverables = (body as { deliverables?: unknown } | null)?.deliverables;
  if (!isDeliverables(deliverables)) return NextResponse.json({ error: "Invalid deliverables." }, { status: 400 });

  const existingResult = await findCampaignCreatorDeal(supabase, id, creator.id);
  if (!existingResult.ok) return NextResponse.json({ error: existingResult.error }, { status: existingResult.status });
  const existing = existingResult.value;
  if (!existing) return NextResponse.json({ error: "No deal found for this creator on this campaign." }, { status: 404 });

  const currentStatus = existing.acceptanceStatus ?? "pending";
  const result = await applyDealChange(supabase, {
    dealId: existing.id,
    expectedStatus: currentStatus,
    patch: { deliverables },
    actor: null,
    event: null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deal: result.value });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const { id, creatorId } = await params;
  const authorized = await getAuthorizedAssignment(id, creatorId);
  if (!authorized) return NextResponse.json(NOT_FOUND, { status: 404 });
  const { creator, supabase } = authorized;

  const { data, error } = await supabase.from("deals").delete().eq("campaignId", id).eq("creatorId", creator.id).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length !== 1) return NextResponse.json({ error: "No deal found for this creator on this campaign." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
