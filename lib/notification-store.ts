import { type Supabase, type StoreResult } from "./assigned-deal-store";

// Best-effort: the deal is already saved when this runs, so a failed notification is logged
// rather than failing the manager's request. The creator still sees the deal on their page.
export async function notifyDealAssigned(supabase: Supabase, input: { userId: string; workspaceId: string; dealId: string }) {
  const { error } = await supabase.from("notifications").insert({
    userId: input.userId,
    workspaceId: input.workspaceId,
    kind: "deal_assigned",
    dealId: input.dealId,
  });
  if (error) console.error("Could not record deal notification:", error.message);
}

export async function markAllNotificationsRead(supabase: Supabase, userId: string): Promise<StoreResult<null>> {
  const { error } = await supabase
    .from("notifications")
    .update({ readAt: new Date().toISOString() })
    .eq("userId", userId)
    .is("readAt", null);
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, value: null };
}
