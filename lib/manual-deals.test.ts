import { describe, it, expect } from "vitest";
import { createFakeSupabase, type FakeQuery, type FakeResult } from "@/lib/testing/fake-supabase";
import { activateManualDeals } from "./manual-deals";

function fakeWith(manualDeals: unknown[], options: { updateError?: { message: string } } = {}) {
  return createFakeSupabase((q: FakeQuery): FakeResult => {
    if (q.table === "deals" && q.op === "select") return { data: manualDeals };
    if (q.table === "deals" && q.op === "update") return { data: null, error: options.updateError ?? null };
    return { data: null, error: null };
  });
}

describe("activateManualDeals", () => {
  it("does nothing when the creator has no manual deals", async () => {
    const fake = fakeWith([]);
    const result = await activateManualDeals(fake as never, { creatorId: "c1", linkedUserId: "user-9" });
    expect(result).toEqual({ ok: true, value: 0 });
    expect(fake.queries.some(q => q.op === "update" || q.table === "deal_offers")).toBe(false);
  });

  it("converts each manual deal to a pending deal owned by the linked account, with an offer and a notification", async () => {
    const fake = fakeWith([{ id: "deal-1", amount: 15000, workspaceId: "ws-1" }]);
    const result = await activateManualDeals(fake as never, { creatorId: "c1", linkedUserId: "user-9" });
    expect(result).toEqual({ ok: true, value: 1 });

    const update = fake.queries.find(q => q.op === "update");
    expect(update?.payload).toMatchObject({ user_id: "user-9", acceptanceStatus: "pending" });
    expect(update?.filters).toMatchObject({ id: "deal-1", acceptanceStatus: "manual" });

    const offer = fake.queries.find(q => q.table === "deal_offers");
    expect(offer?.payload).toMatchObject({ dealId: "deal-1", actor: "manager", event: "offer", amount: 15000 });

    const notification = fake.queries.find(q => q.table === "notifications");
    expect(notification?.payload).toMatchObject({ userId: "user-9", dealId: "deal-1", workspaceId: "ws-1", kind: "deal_assigned" });
  });

  it("reports an error and stops when a deal cannot be converted", async () => {
    const fake = fakeWith([{ id: "deal-1", amount: 15000, workspaceId: "ws-1" }], { updateError: { message: "boom" } });
    const result = await activateManualDeals(fake as never, { creatorId: "c1", linkedUserId: "user-9" });
    expect(result).toEqual({ ok: false, status: 500, error: "boom" });
    expect(fake.queries.some(q => q.table === "deal_offers")).toBe(false);
  });
});
