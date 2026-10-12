import { type Supabase, type StoreResult } from "./assigned-deal-store";
import { notifyDealAssigned } from "./notification-store";

// When a manager links a creator to an account, any manual deals already recorded for that
// creator become real pending deals the creator can see and respond to.
export async function activateManualDeals(
  supabase: Supabase,
  input: { creatorId: string; linkedUserId: string },
): Promise<StoreResult<number>> {
  const { data, error } = await supabase
    .from("deals")
    .select("id, amount, workspaceId")
    .eq("creatorId", input.creatorId)
    .eq("acceptanceStatus", "manual");
  if (error) return { ok: false, status: 500, error: error.message };

  const manualDeals = (data ?? []) as { id: string; amount: number; workspaceId: string }[];
  for (const deal of manualDeals) {
    const { error: updateError } = await supabase
      .from("deals")
      .update({ user_id: input.linkedUserId, acceptanceStatus: "pending", updated_at: new Date().toISOString() })
      .eq("id", deal.id)
      .eq("acceptanceStatus", "manual");
    if (updateError) return { ok: false, status: 500, error: updateError.message };

    const { error: offerError } = await supabase.from("deal_offers").insert({
      dealId: deal.id, actor: "manager", event: "offer", amount: deal.amount, note: "",
    });
    if (offerError) return { ok: false, status: 500, error: offerError.message };

    await notifyDealAssigned(supabase, { userId: input.linkedUserId, workspaceId: deal.workspaceId, dealId: deal.id });
  }
  return { ok: true, value: manualDeals.length };
}
