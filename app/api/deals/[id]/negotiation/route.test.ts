import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeQuery, type FakeResult } from "@/lib/testing/fake-supabase";

const state = vi.hoisted(() => ({ fake: null as unknown, user: null as unknown }));
vi.mock("@/lib/auth/account", () => ({ requireCreator: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => state.fake }));

const { GET, POST } = await import("./route");

const deal = {
  id: "deal-1", brand: "Nike", amount: 15000, dealDate: "2026-10-01", dueDate: "2999-01-01",
  contentCreated: false, sentToBrand: false, posted: false, moneyReceived: false,
  deliverables: [{ type: "Reel", quantity: 2, done: false }], notes: "",
  category: "", contactName: "", contactEmail: "", contactPhone: "", billingAddress: "",
  instagramUrl: null, user_id: "creator-1", workspaceId: "ws-1", campaignId: "camp-1",
  assignedByUserId: "manager-1", acceptanceStatus: "pending",
};

function useFake(current: Record<string, unknown> | null, rpc: FakeResult = { data: null, error: null }) {
  const fake = createFakeSupabase((q: FakeQuery): FakeResult => {
    if (q.table === "deals") return { data: current };
    if (q.table === "deal_offers") return { data: [{ actor: "manager", event: "offer", amount: 15000, note: "", created_at: "2026-10-01T00:00:00Z" }] };
    return { data: null };
  }, (name) => (name === "apply_deal_change" ? { data: { ...deal, acceptanceStatus: "accepted" }, error: rpc.error ?? null } : { data: null }));
  state.fake = fake;
  return fake;
}

const params = Promise.resolve({ id: "deal-1" });
const post = (body: unknown) => POST(new Request("http://localhost/api/deals/deal-1/negotiation", { method: "POST", body: JSON.stringify(body) }), { params });

beforeEach(() => {
  state.user = { sub: "creator-1", email: "c@example.com" };
});

describe("GET /api/deals/[id]/negotiation", () => {
  it("returns the deal and its offer history", async () => {
    useFake(deal);
    const response = await GET(new Request("http://localhost/api/deals/deal-1/negotiation"), { params });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deal.id).toBe("deal-1");
    expect(body.offers).toHaveLength(1);
  });

  it("returns 404 for a deal the creator does not own", async () => {
    useFake(null);
    const response = await GET(new Request("http://localhost/api/deals/deal-1/negotiation"), { params });
    expect(response.status).toBe(404);
  });
});

describe("POST /api/deals/[id]/negotiation", () => {
  it("accepts a pending offer and records the event", async () => {
    const fake = useFake(deal);
    const response = await post({ action: "accept" });
    expect(response.status).toBe(200);
    expect(fake.rpcCalls[0].args).toMatchObject({ p_expected_status: "pending", p_event: "accept", p_actor: "creator" });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ acceptanceStatus: "confirmed", amount: 15000 });
  });

  it("counters with a new amount and note, keeping the agreed amount until the manager confirms", async () => {
    const fake = useFake(deal);
    await post({ action: "counter", counterAmount: 18000, note: "Need more for the extra reel" });
    expect(fake.rpcCalls[0].args).toMatchObject({ p_event: "counter", p_actor: "creator", p_note: "Need more for the extra reel" });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ acceptanceStatus: "countered", amount: 15000 });
  });

  it("rejects a counter equal to the current amount", async () => {
    const fake = useFake(deal);
    const response = await post({ action: "counter", counterAmount: 15000 });
    expect(response.status).toBe(400);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("declines a pending offer", async () => {
    const fake = useFake(deal);
    await post({ action: "decline", note: "Dates clash" });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ acceptanceStatus: "declined" });
    expect(fake.rpcCalls[0].args).toMatchObject({ p_event: "decline", p_note: "Dates clash" });
  });

  it("returns 409 when the deal already moved on", async () => {
    useFake(deal, { data: null, error: { message: "status_changed" } } as unknown as FakeResult);
    const response = await post({ action: "accept" });
    expect(response.status).toBe(409);
  });

  it("rejects an unknown action", async () => {
    useFake(deal);
    const response = await post({ action: "delete" });
    expect(response.status).toBe(400);
  });

  it("rejects an over-long note", async () => {
    useFake(deal);
    const response = await post({ action: "decline", note: "x".repeat(501) });
    expect(response.status).toBe(400);
  });

  it("returns 409 when the creator has already responded", async () => {
    useFake({ ...deal, acceptanceStatus: "accepted" });
    const response = await post({ action: "decline" });
    expect(response.status).toBe(409);
  });
});
