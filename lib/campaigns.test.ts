import { describe, it, expect } from "vitest";
import { isCampaignInput, campaignDateError, isCampaignStatus, type CampaignInput } from "./campaigns";

const validInput: CampaignInput = {
  brand: "Nike",
  title: "Fall Sneaker Drop",
  budget: 50000,
  currency: "INR",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  status: "draft",
};

describe("isCampaignInput", () => {
  it("accepts a fully valid campaign", () => {
    expect(isCampaignInput(validInput)).toBe(true);
  });

  it("rejects a blank brand", () => {
    expect(isCampaignInput({ ...validInput, brand: "   " })).toBe(false);
  });

  it("rejects a blank title", () => {
    expect(isCampaignInput({ ...validInput, title: "" })).toBe(false);
  });

  it("rejects a negative budget", () => {
    expect(isCampaignInput({ ...validInput, budget: -1 })).toBe(false);
  });

  it("rejects a non-finite budget", () => {
    expect(isCampaignInput({ ...validInput, budget: Infinity })).toBe(false);
  });

  it("rejects an unsupported currency", () => {
    expect(isCampaignInput({ ...validInput, currency: "JPY" as CampaignInput["currency"] })).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(isCampaignInput({ ...validInput, status: "cancelled" as CampaignInput["status"] })).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(isCampaignInput({ ...validInput, startDate: "not-a-date" })).toBe(false);
  });

  it("rejects brand longer than 120 chars", () => {
    expect(isCampaignInput({ ...validInput, brand: "a".repeat(121) })).toBe(false);
  });
});

describe("campaignDateError", () => {
  it("allows the end date to equal the start date", () => {
    expect(campaignDateError({ startDate: "2026-01-01", endDate: "2026-01-01" })).toBeNull();
  });

  it("rejects an end date before the start date", () => {
    expect(campaignDateError({ startDate: "2026-01-10", endDate: "2026-01-01" })).toContain("End date");
  });
});

describe("isCampaignStatus", () => {
  it("accepts every defined status", () => {
    for (const status of ["draft", "active", "paused", "completed", "archived"]) {
      expect(isCampaignStatus(status)).toBe(true);
    }
  });

  it("rejects an unknown status", () => {
    expect(isCampaignStatus("cancelled")).toBe(false);
  });
});
