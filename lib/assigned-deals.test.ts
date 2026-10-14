import { describe, it, expect } from "vitest";
import {
  creatorTransition, latestCounterAmount, managerOfferTransition, managerConfirmTransition, managerDeclineTransition, managerSendTransition, creatorAssignedEdit, dealProgressOf,
  isNegotiationAmount, isNegotiationNote,
  DELIVERY_STAGES, deliveryStageFlags, deliveryStageOf, isDeliveryStage,
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
      .toEqual({ ok: true, status: "confirmed", event: "accept", actor: "creator", amount: 15000 });
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

  it("sends a new offer when the price changes after the creator accepted", () => {
    expect(managerOfferTransition({ status: "accepted", amountChanged: true })).toEqual({ ok: true, status: "pending", event: "offer" });
  });
});

describe("created drafts", () => {
  it("saving a created draft keeps it a draft with no offer event", () => {
    expect(managerOfferTransition({ status: "draft", amountChanged: true })).toMatchObject({ ok: true, status: "draft", event: null });
  });

  it("sending a created draft moves it to pending with an offer event", () => {
    expect(managerSendTransition("draft")).toMatchObject({ ok: true, status: "pending", event: "offer" });
  });

  it("only a created draft can be sent", () => {
    for (const status of ["pending", "declined", "accepted", "confirmed", "countered", "manual"] as const) {
      expect(managerSendTransition(status)).toMatchObject({ ok: false, httpStatus: 409 });
    }
  });

  it("shows a created draft as Created, and cannot confirm or stage it", () => {
    expect(dealProgressOf({ ...assigned, acceptanceStatus: "draft" })).toBe("draft");
    expect(managerConfirmTransition("draft", 15000)).toMatchObject({ ok: false });
  });
});

describe("managerDeclineTransition", () => {
  it("declines a pending or countered offer", () => {
    expect(managerDeclineTransition("countered", 18000)).toEqual({ ok: true, status: "declined", event: "decline", actor: "manager", amount: 18000 });
    expect(managerDeclineTransition("pending", 15000)).toMatchObject({ ok: true, status: "declined" });
  });

  it.each(["accepted", "confirmed", "declined", "draft", "manual"] as const)("refuses to decline while %s", status => {
    expect(managerDeclineTransition(status, 15000)).toMatchObject({ ok: false, httpStatus: 409 });
  });
});

describe("managerConfirmTransition", () => {
  it("confirms an accepted amount", () => {
    expect(managerConfirmTransition("accepted", 15000)).toEqual({ ok: true, status: "confirmed", event: "accept", actor: "manager", amount: 15000 });
  });

  it("accepts the creator's counter-offer as the final amount", () => {
    expect(managerConfirmTransition("countered", 18000)).toEqual({ ok: true, status: "confirmed", event: "accept", actor: "manager", amount: 18000 });
    expect(managerConfirmTransition("pending", 15000)).toEqual({ ok: true, status: "confirmed", event: "accept", actor: "manager", amount: 15000 });
  });

  it.each(["declined", "confirmed"] as const)("refuses to confirm while %s", status => {
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

describe("manual deals", () => {
  it("amends a manual deal directly, whether or not the amount changed, with no offer event", () => {
    expect(managerOfferTransition({ status: "manual", amountChanged: true })).toEqual({ ok: true, status: "manual", event: null });
    expect(managerOfferTransition({ status: "manual", amountChanged: false })).toEqual({ ok: true, status: "manual", event: null });
  });

  it("cannot be confirmed, because no creator has responded", () => {
    expect(managerConfirmTransition("manual", 15000)).toMatchObject({ ok: false, httpStatus: 409 });
  });
});

describe("delivery stages", () => {
  it("maps each stage to cumulative flags", () => {
    expect(deliveryStageFlags("not_started", null, "2026-10-20")).toEqual({ contentCreated: false, sentToBrand: false, posted: false, moneyReceived: false, postedDate: null });
    expect(deliveryStageFlags("content_created", null, "2026-10-20")).toMatchObject({ contentCreated: true, sentToBrand: false, posted: false, moneyReceived: false });
    expect(deliveryStageFlags("sent_to_brand", null, "2026-10-20")).toMatchObject({ contentCreated: true, sentToBrand: true, posted: false });
    expect(deliveryStageFlags("settled", null, "2026-10-20")).toEqual({ contentCreated: true, sentToBrand: true, posted: true, moneyReceived: true, postedDate: "2026-10-20" });
  });

  it("keeps an existing posted date and clears it when the deal is no longer posted", () => {
    expect(deliveryStageFlags("posted", "2026-10-15", "2026-10-20").postedDate).toBe("2026-10-15");
    expect(deliveryStageFlags("sent_to_brand", "2026-10-15", "2026-10-20").postedDate).toBeNull();
  });

  it("reads the stage back from the flags", () => {
    const base = { contentCreated: false, sentToBrand: false, posted: false, moneyReceived: false };
    expect(deliveryStageOf(base)).toBe("not_started");
    expect(deliveryStageOf({ ...base, contentCreated: true })).toBe("content_created");
    expect(deliveryStageOf({ ...base, contentCreated: true, sentToBrand: true })).toBe("sent_to_brand");
    expect(deliveryStageOf({ ...base, contentCreated: true, sentToBrand: true, posted: true })).toBe("posted");
    expect(deliveryStageOf({ contentCreated: true, sentToBrand: true, posted: true, moneyReceived: true })).toBe("settled");
  });

  it("round-trips every stage", () => {
    for (const stage of DELIVERY_STAGES) {
      const flags = deliveryStageFlags(stage, null, "2026-10-20");
      expect(deliveryStageOf(flags)).toBe(stage);
    }
    expect(isDeliveryStage("posted")).toBe(true);
    expect(isDeliveryStage("bogus")).toBe(false);
  });

  it("returns the latest creator counter amount from the offer history", () => {
    expect(latestCounterAmount([])).toBeNull();
    expect(latestCounterAmount([{ event: "offer", amount: 30000 }, { event: "counter", amount: 25000 }])).toBe(25000);
    expect(latestCounterAmount([
      { event: "counter", amount: 25000 }, { event: "offer", amount: 32000 },
    ])).toBe(25000);
    expect(latestCounterAmount([{ event: "offer", amount: 32000 }])).toBeNull();
  });
});
