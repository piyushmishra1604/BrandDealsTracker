import { NextResponse } from "next/server";
import { isAssignedDealInput, isDeliverables, assignedDealDateError, todayDate, type Deal } from "@/lib/deals";
import {
  managerAssignedFields, managerOfferTransition, managerSendTransition, isNegotiationNote, isDeliveryStage, deliveryStageFlags, canSetDeliveryStage, type ManagerAssignmentInput,
} from "@/lib/assigned-deals";
import {
  getAuthorizedAssignment, findCampaignCreatorDeal, applyDealChange, type Supabase,
} from "@/lib/assigned-deal-store";
import { notifyDealAssigned } from "@/lib/notification-store";

const NOT_FOUND = { error: "Campaign not found." } as const;

// Linked creators get a draft that the creator can't see until the manager sends it (PATCH with send).
// Unlinked creators get a manual deal that is recorded off-platform and has no owner until the creator is linked.
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
      supabase, campaign, managerUserId: access.sub, campaignId: id, creatorProfileId: creator.id, isLinked: Boolean(creator.linkedUserId), input: body,
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
  isLinked: boolean;
  input: ManagerAssignmentInput;
}) {
  const { supabase, campaign, managerUserId, campaignId, creatorProfileId, isLinked } = input;
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
    acceptanceStatus: isLinked ? "draft" : "manual",
    user_id: null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data as Deal });
}

// Manager edits the deliverable list (add, remove, or tick done), the delivery stage, or sends a
// created deal to the creator. Only sending changes the offer status. Stage and deliverable edits keep it.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const { id, creatorId } = await params;
  const authorized = await getAuthorizedAssignment(id, creatorId);
  if (!authorized) return NextResponse.json(NOT_FOUND, { status: 404 });
  const { campaign, supabase, creator } = authorized;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { deliverables, stage, send, note } = (body as { deliverables?: unknown; stage?: unknown; send?: unknown; note?: unknown } | null) ?? {};
  if (send !== undefined && send !== true) return NextResponse.json({ error: "Invalid send request." }, { status: 400 });
  if (send === true && note !== undefined && note !== null && !isNegotiationNote(note)) {
    return NextResponse.json({ error: "The note must be 500 characters or fewer." }, { status: 400 });
  }
  if (send !== true && stage !== undefined && !isDeliveryStage(stage)) return NextResponse.json({ error: "Invalid delivery stage." }, { status: 400 });
  if (send !== true && stage === undefined && !isDeliverables(deliverables)) return NextResponse.json({ error: "Invalid deliverables." }, { status: 400 });

  const existingResult = await findCampaignCreatorDeal(supabase, id, creator.id);
  if (!existingResult.ok) return NextResponse.json({ error: existingResult.error }, { status: existingResult.status });
  const existing = existingResult.value;
  if (!existing) return NextResponse.json({ error: "No deal found for this creator on this campaign." }, { status: 404 });

  if (send === true) {
    const sendTransition = managerSendTransition(existing.acceptanceStatus ?? "pending");
    if (!sendTransition.ok) return NextResponse.json({ error: sendTransition.error }, { status: sendTransition.httpStatus });
    if (!creator.linkedUserId) {
      return NextResponse.json({ error: "Link this creator to a CollabFlow account before sending the offer." }, { status: 400 });
    }
    const sent = await applyDealChange(supabase, {
      dealId: existing.id,
      expectedStatus: "draft",
      patch: { acceptanceStatus: sendTransition.status, user_id: creator.linkedUserId },
      actor: "manager",
      event: sendTransition.event,
      note: typeof note === "string" ? note : "",
    });
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: sent.status });
    await notifyDealAssigned(supabase, { userId: creator.linkedUserId, workspaceId: campaign.workspaceId, dealId: existing.id });
    return NextResponse.json({ deal: sent.value });
  }

  const currentStatus = existing.acceptanceStatus ?? "pending";
  if (isDeliveryStage(stage) && !canSetDeliveryStage(currentStatus)) {
    return NextResponse.json({ error: "The creator has to accept this deal before its delivery stage can change." }, { status: 409 });
  }
  const patch = isDeliveryStage(stage)
    ? deliveryStageFlags(stage, existing.postedDate, todayDate())
    : { deliverables };
  const result = await applyDealChange(supabase, {
    dealId: existing.id,
    expectedStatus: currentStatus,
    patch,
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
