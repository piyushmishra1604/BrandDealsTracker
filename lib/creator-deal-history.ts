import { type AcceptanceStatus } from "./deals";

export type CreatorDealRow = {
  id: string;
  brand: string | null;
  amount: number | null;
  dealDate: string | null;
  dueDate: string | null;
  acceptanceStatus: AcceptanceStatus | null;
  moneyReceived: boolean;
  campaignId: string | null;
  campaign: { id: string; title: string; brand: string | null; status: string } | null;
};

export type CreatorDealRecord = {
  amount: number | null;
  acceptanceStatus: AcceptanceStatus | null;
  moneyReceived: boolean;
};

export type CreatorDealStage = "active" | "completed" | "declined";

// Declined deals leave both totals. A deal with money received is completed; everything else is active.
export function dealStage(deal: Pick<CreatorDealRecord, "acceptanceStatus" | "moneyReceived">): CreatorDealStage {
  if (deal.acceptanceStatus === "declined") return "declined";
  return deal.moneyReceived ? "completed" : "active";
}

export type CreatorDealSummary = {
  activeCount: number;
  activeValue: number;
  completedCount: number;
  completedValue: number;
};

// Only a final amount that both sides agreed on counts toward money; pending, accepted, or countered
// amounts are still negotiating. A manually entered deal is treated as agreed.
function isAgreed(status: AcceptanceStatus | null): boolean {
  return status === "confirmed" || status === "manual";
}

export function summarizeCreatorDeals(deals: CreatorDealRecord[]): CreatorDealSummary {
  const summary: CreatorDealSummary = { activeCount: 0, activeValue: 0, completedCount: 0, completedValue: 0 };
  for (const deal of deals) {
    const amount = isAgreed(deal.acceptanceStatus) ? Number(deal.amount) || 0 : 0;
    const stage = dealStage(deal);
    if (stage === "active") {
      summary.activeCount += 1;
      summary.activeValue += amount;
    } else if (stage === "completed") {
      summary.completedCount += 1;
      summary.completedValue += amount;
    }
  }
  return summary;
}

export type CreatorDealGroup = {
  campaign: NonNullable<CreatorDealRow["campaign"]> | null;
  deals: CreatorDealRow[];
};

// One group per campaign, sorted by title. Deals with no campaign go in a final group with campaign: null.
export function groupDealsByCampaign(deals: CreatorDealRow[]): CreatorDealGroup[] {
  const groups = new Map<string, CreatorDealGroup>();
  for (const deal of deals) {
    const key = deal.campaign?.id ?? "";
    const group = groups.get(key) ?? { campaign: deal.campaign ?? null, deals: [] };
    group.deals.push(deal);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.campaign) return 1;
    if (!b.campaign) return -1;
    return a.campaign.title.localeCompare(b.campaign.title);
  });
}
