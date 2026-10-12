import { describe, it, expect } from "vitest";
import { dealStage, groupDealsByCampaign, summarizeCreatorDeals } from "./creator-deal-history";

describe("dealStage", () => {
  it("treats declined deals as declined even when money was received", () => {
    expect(dealStage({ acceptanceStatus: "declined", moneyReceived: false })).toBe("declined");
    expect(dealStage({ acceptanceStatus: "declined", moneyReceived: true })).toBe("declined");
  });

  it("marks deals with money received as completed", () => {
    expect(dealStage({ acceptanceStatus: "confirmed", moneyReceived: true })).toBe("completed");
  });

  it("marks unpaid, non-declined deals as active, including manual and pending ones", () => {
    expect(dealStage({ acceptanceStatus: "pending", moneyReceived: false })).toBe("active");
    expect(dealStage({ acceptanceStatus: "manual", moneyReceived: false })).toBe("active");
    expect(dealStage({ acceptanceStatus: null, moneyReceived: false })).toBe("active");
  });
});

describe("summarizeCreatorDeals", () => {
  it("splits totals into active and completed without double counting", () => {
    const summary = summarizeCreatorDeals([
      { amount: 10000, acceptanceStatus: "confirmed", moneyReceived: false },
      { amount: 5000, acceptanceStatus: "manual", moneyReceived: false },
      { amount: 8000, acceptanceStatus: "confirmed", moneyReceived: true },
      { amount: 3000, acceptanceStatus: "declined", moneyReceived: false },
    ]);
    expect(summary).toEqual({ activeCount: 2, activeValue: 15000, completedCount: 1, completedValue: 8000 });
  });

  it("returns zeros for a creator with no deals", () => {
    expect(summarizeCreatorDeals([])).toEqual({ activeCount: 0, activeValue: 0, completedCount: 0, completedValue: 0 });
  });

  it("reads numeric strings and empty amounts as numbers", () => {
    const summary = summarizeCreatorDeals([
      { amount: "2500" as unknown as number, acceptanceStatus: "pending", moneyReceived: false },
      { amount: null, acceptanceStatus: "pending", moneyReceived: false },
    ]);
    expect(summary.activeValue).toBe(2500);
    expect(summary.activeCount).toBe(2);
  });
});

describe("groupDealsByCampaign", () => {
  const camp = (id: string, title: string) => ({ id, title, brand: "Brand", status: "active" });
  const deal = (id: string, campaign: ReturnType<typeof camp> | null) => ({
    id, brand: null, amount: 1000, dealDate: null, dueDate: null, acceptanceStatus: "pending" as const,
    moneyReceived: false, campaignId: campaign?.id ?? null, campaign,
  });

  it("groups deals by campaign, sorted by title, with unattached deals last", () => {
    const zed = camp("c-z", "Zed Drop");
    const alpha = camp("c-a", "Alpha Launch");
    const groups = groupDealsByCampaign([deal("1", zed), deal("2", null), deal("3", alpha), deal("4", zed)]);
    expect(groups.map((g) => g.campaign?.title ?? "Other")).toEqual(["Alpha Launch", "Zed Drop", "Other"]);
    expect(groups[1].deals.map((d) => d.id)).toEqual(["1", "4"]);
    expect(groups[2].campaign).toBeNull();
  });

  it("returns no groups for no deals", () => {
    expect(groupDealsByCampaign([])).toEqual([]);
  });
});
