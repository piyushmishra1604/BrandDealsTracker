import { NextResponse } from "next/server";
import { isAssignedDealInput, assignedDealDateError, todayDate, type Deal } from "@/lib/deals";
import { managerAssignedFields, managerOfferTransition, isNegotiationNote, type ManagerAssignmentInput } from "@/lib/assigned-deals";
import {
  getAuthorizedAssignment, findCampaignCreatorDeal, applyDealChange, type Supabase,
} from "@/lib/assigned-deal-store";

const NOT_FOUND = { error: "Campaign not found." } as const;

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

  const note = (body as { note?: unknown }).note;
  if (note !== undefined && note !== null && !isNegotiationNote(note)) {
    return NextResponse.json({ error: "The note must be 500 characters or fewer." }, { status: 400 });
  }
  const offerNote = typeof note === "string" ? note : "";

  const existingResult = await findCampaignCreatorDeal(supabase, id, creator.linkedUserId);
  if (!existingResult.ok) return NextResponse.json({ error: existingResult.error }, { status: existingResult.status });
  const existing = existingResult.value;

  if (!existing) {
    return createAssignedDeal({
      supabase, campaign, managerUserId: access.sub, campaignId: id, linkedUserId: creator.linkedUserId, input: body, offerNote,
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
  linkedUserId: string;
  input: ManagerAssignmentInput;
  offerNote: string;
}) {
  const { supabase, campaign, managerUserId, campaignId, linkedUserId, offerNote } = input;
  const { data, error } = await supabase.from("deals").insert({
    ...managerAssignedFields(null, input.input, campaign.brand),
    dealDate: todayDate(),
    contentCreated: false,
    sentToBrand: false,
    posted: false,
    moneyReceived: false,
    workspaceId: campaign.workspaceId,
    campaignId,
    assignedByUserId: managerUserId,
    acceptanceStatus: "pending",
    user_id: linkedUserId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const deal = data as Deal;

  // The first offer goes into the history table. If that fails, remove the deal so the
  // manager can retry instead of being left with a pending deal that has no offer on record.
  const { error: offerError } = await supabase.from("deal_offers").insert({
    dealId: deal.id, actor: "manager", event: "offer", amount: deal.amount, note: offerNote,
  });
  if (offerError) {
    await supabase.from("deals").delete().eq("id", deal.id);
    return NextResponse.json({ error: offerError.message }, { status: 500 });
  }
  return NextResponse.json({ deal });
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
