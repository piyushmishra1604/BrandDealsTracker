import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isDeal, type AcceptanceStatus, type Deal } from "@/lib/deals";
import { type NegotiationActor, type NegotiationEvent } from "@/lib/assigned-deals";

export type Supabase = ReturnType<typeof getSupabaseAdmin>;

export type DealOffer = {
  actor: NegotiationActor;
  event: NegotiationEvent;
  amount: number;
  note: string;
  created_at: string;
};

export type StoreResult<T> = { ok: true; value: T } | { ok: false; status: 400 | 403 | 404 | 409 | 500; error: string };

// Assigning a deal requires the creator to already be on this campaign (added via the
// Creators & Deals picker). Linked creators get a pending deal owned by their account; unlinked
// creators get a manual deal with no owner.
export async function getAuthorizedAssignment(campaignId: string, creatorId: string) {
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

// The one assigned deal for a campaign/creator pair, or null when none exists yet. Keyed on the
// creator directory id because manual deals have no user_id.
export async function findCampaignCreatorDeal(supabase: Supabase, campaignId: string, creatorId: string): Promise<StoreResult<Deal | null>> {
  const { data, error } = await supabase.from("deals").select("*").eq("campaignId", campaignId).eq("creatorId", creatorId).maybeSingle();
  if (error) return { ok: false, status: 500, error: error.message };
  if (!data) return { ok: true, value: null };
  if (!isDeal(data)) return { ok: false, status: 500, error: "The saved deal has an unexpected format." };
  return { ok: true, value: data };
}

// Creator directory ids linked to this login. A manager-added deal for one of these creators is visible to the login.
export async function linkedCreatorIds(supabase: Supabase, userId: string): Promise<StoreResult<string[]>> {
  const { data, error } = await supabase.from("creators").select("id").eq("linkedUserId", userId);
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, value: (data ?? []).map((row) => row.id as string) };
}

// Deals a creator login can see: their own, plus any deal a manager added for a creator linked to
// this login. Drafts stay hidden until the manager sends them.
export async function visibleCreatorDeals(supabase: Supabase, userId: string): Promise<StoreResult<Deal[]>> {
  const linked = await linkedCreatorIds(supabase, userId);
  if (!linked.ok) return linked;
  const filter = linked.value.length
    ? `user_id.eq.${userId},creatorId.in.(${linked.value.join(",")})`
    : `user_id.eq.${userId}`;
  const { data, error } = await supabase.from("deals").select("*").or(filter).order("dealDate", { ascending: false });
  if (error) return { ok: false, status: 500, error: error.message };
  const rows = (data ?? []).filter((row) => row.acceptanceStatus !== "draft");
  if (!rows.every(isDeal)) return { ok: false, status: 500, error: "The saved deals have an unexpected format." };
  return { ok: true, value: rows as Deal[] };
}

// A creator may only negotiate a deal they can see that a manager assigned to them.
export async function findOwnedAssignedDeal(supabase: Supabase, dealId: string, userId: string): Promise<StoreResult<Deal>> {
  const visible = await visibleCreatorDeals(supabase, userId);
  if (!visible.ok) return visible;
  const data = visible.value.find((deal) => deal.id === dealId);
  if (!data) return { ok: false, status: 404, error: "Deal not found." };
  if (!data.campaignId) return { ok: false, status: 400, error: "This deal was not assigned by a manager." };
  return { ok: true, value: data };
}

// Atomic status check + update + history row. A 409 means someone else acted first.
export async function applyDealChange(supabase: Supabase, change: {
  dealId: string;
  expectedStatus: AcceptanceStatus;
  patch: Record<string, unknown>;
  actor: NegotiationActor | null;
  event: NegotiationEvent | null;
  note?: string;
}): Promise<StoreResult<Deal>> {
  const { data, error } = await supabase.rpc("apply_deal_change", {
    p_deal_id: change.dealId,
    p_expected_status: change.expectedStatus,
    p_patch: change.patch,
    p_actor: change.actor,
    p_event: change.event,
    p_note: change.note ?? "",
  });
  if (error) {
    if (error.message.includes("status_changed")) {
      return { ok: false, status: 409, error: "This deal changed while you were looking at it. Refresh to see the latest status." };
    }
    if (error.message.includes("deal_not_found")) return { ok: false, status: 404, error: "Deal not found." };
    return { ok: false, status: 500, error: error.message };
  }
  if (!isDeal(data)) return { ok: false, status: 500, error: "The database returned an unexpected result." };
  return { ok: true, value: data };
}

export async function loadDealOffers(supabase: Supabase, dealId: string): Promise<StoreResult<DealOffer[]>> {
  const { data, error } = await supabase
    .from("deal_offers")
    .select("actor, event, amount, note, created_at")
    .eq("dealId", dealId)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, value: (data ?? []) as DealOffer[] };
}
