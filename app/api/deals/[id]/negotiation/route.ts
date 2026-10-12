import { NextResponse } from "next/server";
import { requireCreator } from "@/lib/auth/account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { creatorTransition, isNegotiationNote, type CreatorAction } from "@/lib/assigned-deals";
import { findOwnedAssignedDeal, applyDealChange, loadDealOffers } from "@/lib/assigned-deal-store";

const CREATOR_ACTIONS: readonly CreatorAction[] = ["accept", "counter", "decline"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireCreator();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const dealResult = await findOwnedAssignedDeal(supabase, id, user.sub);
  if (!dealResult.ok) return NextResponse.json({ error: dealResult.error }, { status: dealResult.status });
  const offersResult = await loadDealOffers(supabase, id);
  if (!offersResult.ok) return NextResponse.json({ error: offersResult.error }, { status: offersResult.status });
  return NextResponse.json({ deal: dealResult.value, offers: offersResult.value });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireCreator();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  let body: { action?: unknown; counterAmount?: unknown; note?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!CREATOR_ACTIONS.includes(body.action as CreatorAction)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (body.note !== undefined && !isNegotiationNote(body.note)) {
    return NextResponse.json({ error: "The note must be 500 characters or fewer." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const dealResult = await findOwnedAssignedDeal(supabase, id, user.sub);
  if (!dealResult.ok) return NextResponse.json({ error: dealResult.error }, { status: dealResult.status });
  const deal = dealResult.value;

  const currentStatus = deal.acceptanceStatus ?? "pending";
  const transition = creatorTransition({
    status: currentStatus,
    amount: deal.amount,
    action: body.action as CreatorAction,
    counterAmount: body.counterAmount,
  });
  if (!transition.ok) return NextResponse.json({ error: transition.error }, { status: transition.httpStatus });

  const result = await applyDealChange(supabase, {
    dealId: deal.id,
    expectedStatus: currentStatus,
    patch: { acceptanceStatus: transition.status, amount: transition.amount },
    actor: transition.actor,
    event: transition.event,
    note: typeof body.note === "string" ? body.note : "",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deal: result.value });
}
