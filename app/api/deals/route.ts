import { NextResponse } from "next/server";
import { requireCreator } from "@/lib/auth/account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isDeal, dealDateError, type Deal } from "@/lib/deals";
import { creatorAssignedEdit, UNASSIGNED_DEAL_FIELDS } from "@/lib/assigned-deals";
import { linkedCreatorIds, visibleCreatorDeals } from "@/lib/assigned-deal-store";

export async function GET() {
  const user = await requireCreator();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const result = await visibleCreatorDeals(getSupabaseAdmin(), user.sub);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ deals: result.value });
}

// Creators own their deals, but a deal a manager assigned is only partly theirs to edit.
// Assigned deals go through creatorAssignedEdit; anything else is saved with the assignment
// columns forced to null so a creator can't make a deal look manager-assigned.
export async function POST(request: Request) {
  const user = await requireCreator();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let deal: unknown;
  try { deal = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!isDeal(deal)) return NextResponse.json({ error: "Invalid deal data." }, { status: 400 });
  const dateError = dealDateError(deal as Deal);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing, error: lookupError } = await supabase.from("deals").select("*").eq("id", (deal as Deal).id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  // A manager-assigned deal can be saved by the login linked to its creator, even if user_id points at an older login.
  if (existing && existing.user_id !== user.sub) {
    const linked = existing.campaignId ? await linkedCreatorIds(supabase, user.sub) : null;
    if (linked && !linked.ok) return NextResponse.json({ error: linked.error }, { status: linked.status });
    if (!linked || !linked.value.includes(existing.creatorId)) {
      return NextResponse.json({ error: "You don't have access to this deal." }, { status: 403 });
    }
  }

  if (existing?.campaignId) {
    if (!isDeal(existing)) return NextResponse.json({ error: "The saved deal has an unexpected format." }, { status: 500 });
    const edit = creatorAssignedEdit(existing, deal as Deal);
    if (!edit.ok) return NextResponse.json({ error: edit.error }, { status: 400 });
    const { data, error } = await supabase.from("deals").update(edit.changes).eq("id", existing.id).select().single();
    if (error) return saveError(error);
    if (!isDeal(data)) return NextResponse.json({ error: "The database returned an unexpected result." }, { status: 500 });
    return NextResponse.json({ deal: data });
  }

  const { data, error } = await supabase.from("deals")
    .upsert({ ...(deal as Deal), ...UNASSIGNED_DEAL_FIELDS, user_id: user.sub }, { onConflict: "id" })
    .select().single();
  if (error) return saveError(error);
  if (!isDeal(data)) return NextResponse.json({ error: "The database returned an unexpected result." }, { status: 500 });
  return NextResponse.json({ deal: data });
}

// 23514 is a CHECK violation, e.g. marking posted before the brand was sent the content.
function saveError(error: { code?: string; message: string }) {
  if (error.code === "23514") {
    return NextResponse.json({ error: "Delivery steps must be done in order: content created, sent to brand, posted, then money received." }, { status: 400 });
  }
  return NextResponse.json({ error: error.message }, { status: 500 });
}
