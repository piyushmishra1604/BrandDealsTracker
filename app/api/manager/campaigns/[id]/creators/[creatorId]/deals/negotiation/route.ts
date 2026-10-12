import { NextResponse } from "next/server";
import { managerConfirmTransition, isNegotiationNote } from "@/lib/assigned-deals";
import {
  getAuthorizedAssignment, findCampaignCreatorDeal, applyDealChange, loadDealOffers,
} from "@/lib/assigned-deal-store";

const NOT_FOUND = { error: "Campaign not found." } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const { id, creatorId } = await params;
  const authorized = await getAuthorizedAssignment(id, creatorId);
  if (!authorized) return NextResponse.json(NOT_FOUND, { status: 404 });
  const { creator, supabase } = authorized;

  const dealResult = await findCampaignCreatorDeal(supabase, id, creator.id);
  if (!dealResult.ok) return NextResponse.json({ error: dealResult.error }, { status: dealResult.status });
  if (!dealResult.value) return NextResponse.json({ deal: null, offers: [] });

  const offersResult = await loadDealOffers(supabase, dealResult.value.id);
  if (!offersResult.ok) return NextResponse.json({ error: offersResult.error }, { status: offersResult.status });
  return NextResponse.json({ deal: dealResult.value, offers: offersResult.value });
}

// Manager confirms the amount the creator accepted, or accepts the creator's counter-offer.
export async function POST(request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const { id, creatorId } = await params;
  const authorized = await getAuthorizedAssignment(id, creatorId);
  if (!authorized) return NextResponse.json(NOT_FOUND, { status: 404 });
  const { creator, supabase } = authorized;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if ((body as { action?: unknown })?.action !== "confirm") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const note = (body as { note?: unknown }).note;
  if (note !== undefined && !isNegotiationNote(note)) {
    return NextResponse.json({ error: "The note must be 500 characters or fewer." }, { status: 400 });
  }

  const dealResult = await findCampaignCreatorDeal(supabase, id, creator.id);
  if (!dealResult.ok) return NextResponse.json({ error: dealResult.error }, { status: dealResult.status });
  const deal = dealResult.value;
  if (!deal) return NextResponse.json({ error: "No deal found for this creator on this campaign." }, { status: 404 });

  const currentStatus = deal.acceptanceStatus ?? "pending";
  const transition = managerConfirmTransition(currentStatus, deal.amount);
  if (!transition.ok) return NextResponse.json({ error: transition.error }, { status: transition.httpStatus });

  const result = await applyDealChange(supabase, {
    dealId: deal.id,
    expectedStatus: currentStatus,
    patch: { acceptanceStatus: transition.status, amount: transition.amount },
    actor: transition.actor,
    event: transition.event,
    note: typeof note === "string" ? note : "",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deal: result.value });
}
