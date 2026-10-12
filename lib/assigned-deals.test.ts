import { describe, it, expect } from "vitest";
import {
  creatorTransition, managerOfferTransition, managerConfirmTransition, creatorAssignedEdit,
  isNegotiationAmount, isNegotiationNote,
} from "./assigned-deals";
import { type Deal } from "./deals";

const assigned: Deal = {
  id: "deal-1", brand: "Acme", amount: 15000, dealDate: "2026-10-01", dueDate: "2026-10-30",
  contentCreated: false, sentToBrand: false, posted: false, moneyReceived: false,
  deliverables: [{ type: "Reel", quantity: 2, done: false }],
  workspaceId: "ws-1", campaignId: "camp-1", assignedByUserId: "mgr-1", acceptanceStatus: "pending",
  notes: "", category: "",
};

describe("creatorTransition", () => {
  it("accepting an open offer moves it to accepted at the offered amount", () => {
    expect(creatorTransition({ status: "pending", amount: 15000, action: "accept" }))
      .toEqual({ ok: true, status: "accepted", event: "accept", actor: "creator", amount: 15000 });
  });

  it("declining an open offer moves it to declined", () => {
    expect(creatorTransition({ status: "pending", amount: 15000, action: "decline" }))
      .toMatchObject({ ok: true, status: "declined", event: "decline" });
  });

  it("countering stores the counter amount as the price under discussion", () => {
    expect(creatorTransition({ status: "pending", amount: 15000, action: "counter", counterAmount: 18000 }))
      .toEqual({ ok: true, status: "countered", event: "counter", actor: "creator", amount: 18000 });
  });

  it("rejects a counter without a valid amount", () => {
    expect(creatorTransition({ status: "pending", amount: 15000, action: "counter" })).toMatchObject({ ok: false, httpStatus: 400 });
    expect(creatorTransition({ status: "pending", amount: 15000, action: "counter", counterAmount: -5 })).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it("rejects a counter that equals the current amount", () => {
    expect(creatorTransition({ status: "pending", amount: 15000, action: "counter", counterAmount: 15000 })).toMatchObject({ ok: false, httpStatus: 400 });
  });

  it.each(["countered", "accepted", "confirmed", "declined"] as const)("gives the creator no actions while %s", status => {
    expect(creatorTransition({ status, amount: 15000, action: "accept" })).toMatchObject({ ok: false, httpStatus: 409 });
    expect(creatorTransition({ status, amount: 15000, action: "decline" })).toMatchObject({ ok: false, httpStatus: 409 });
  });
});

describe("managerOfferTransition", () => {
  it("changing the amount sends a new offer from any open or confirmed state", () => {
    expect(managerOfferTransition({ status: "pending", amountChanged: true })).toEqual({ ok: true, status: "pending", event: "offer" });
    expect(managerOfferTransition({ status: "countered", amountChanged: true })).toEqual({ ok: true, status: "pending", event: "offer" });
    expect(managerOfferTransition({ status: "confirmed", amountChanged: true })).toEqual({ ok: true, status: "pending", event: "offer" });
  });

  it("re-offering after a decline always reopens the deal", () => {
    expect(managerOfferTransition({ status: "declined", amountChanged: false })).toEqual({ ok: true, status: "pending", event: "offer" });
  });

  it("keeps the status for edits that don't touch the amount", () => {
    expect(managerOfferTransition({ status: "countered", amountChanged: false })).toEqual({ ok: true, status: "countered", event: null });
    expect(managerOfferTransition({ status: "confirmed", amountChanged: false })).toEqual({ ok: true, status: "confirmed", event: null });
  });

  it("blocks an amount change while the creator's acceptance is waiting for confirmation", () => {
    expect(managerOfferTransition({ status: "accepted", amountChanged: true })).toMatchObject({ ok: false, httpStatus: 409 });
    expect(managerOfferTransition({ status: "accepted", amountChanged: false })).toEqual({ ok: true, status: "accepted", event: null });
  });
});

describe("managerConfirmTransition", () => {
  it("confirms an accepted amount", () => {
    expect(managerConfirmTransition("accepted", 15000)).toEqual({ ok: true, status: "confirmed", event: "confirm", actor: "manager", amount: 15000 });
  });

  it("accepts the creator's counter-offer as the final amount", () => {
    expect(managerConfirmTransition("countered", 18000)).toEqual({ ok: true, status: "confirmed", event: "confirm", actor: "manager", amount: 18000 });
  });

  it.each(["pending", "declined", "confirmed"] as const)("refuses to confirm while %s", status => {
    expect(managerConfirmTransition(status, 15000)).toMatchObject({ ok: false, httpStatus: 409 });
  });
});

describe("creatorAssignedEdit", () => {
  it("lets the creator update delivery progress, notes, and contact details", () => {
    const incoming: Deal = { ...assigned, notes: "Shooting Sunday", contactName: "Asha", posted: false, contentCreated: true, deliverables: [{ type: "Reel", quantity: 2, done: true }] };
    const result = creatorAssignedEdit(assigned, incoming);
    expect(result).toMatchObject({ ok: true, changes: { notes: "Shooting Sunday", contactName: "Asha", contentCreated: true } });
    if (result.ok) expect(result.changes.deliverables).toEqual([{ type: "Reel", quantity: 2, done: true }]);
  });

  it.each([
    ["amount", { amount: 1 }],
    ["brand", { brand: "Other" }],
    ["dueDate", { dueDate: "2026-11-30" }],
    ["dealDate", { dealDate: "2026-09-30" }],
    ["acceptanceStatus", { acceptanceStatus: "accepted" as const }],
    ["campaignId", { campaignId: null }],
  ])("rejects a change to the manager-set %s", (_field, change) => {
    expect(creatorAssignedEdit(assigned, { ...assigned, ...change })).toMatchObject({ ok: false });
  });

  it("rejects a change to deliverable type or quantity", () => {
    expect(creatorAssignedEdit(assigned, { ...assigned, deliverables: [{ type: "Post", quantity: 2 }] })).toMatchObject({ ok: false });
    expect(creatorAssignedEdit(assigned, { ...assigned, deliverables: [{ type: "Reel", quantity: 3 }] })).toMatchObject({ ok: false });
  });
});

describe("input guards", () => {
  it("validates negotiation amounts and notes", () => {
    expect(isNegotiationAmount(0)).toBe(true);
    expect(isNegotiationAmount(-1)).toBe(false);
    expect(isNegotiationAmount(Number.NaN)).toBe(false);
    expect(isNegotiationAmount("100")).toBe(false);
    expect(isNegotiationNote("x".repeat(500))).toBe(true);
    expect(isNegotiationNote("x".repeat(501))).toBe(false);
  });
});
