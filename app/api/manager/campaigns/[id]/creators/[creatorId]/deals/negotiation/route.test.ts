import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeQuery, type FakeResult } from "@/lib/testing/fake-supabase";

const state = vi.hoisted(() => ({ fake: null as unknown, access: null as unknown }));
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: async () => state.access }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => state.fake }));

const { GET, POST } = await import("./route");

const deal = {
  id: "deal-1", brand: "Nike", amount: 18000, dealDate: "2026-10-01", dueDate: "2999-01-01",
  contentCreated: false, sentToBrand: false, posted: false, moneyReceived: false,
  deliverables: [{ type: "Reel", quantity: 2, done: false }], notes: "",
  category: "", contactName: "", contactEmail: "", contactPhone: "", billingAddress: "",
  instagramUrl: null, user_id: "creator-1", workspaceId: "workspace-a", campaignId: "camp-1",
  assignedByUserId: "manager-1", acceptanceStatus: "countered",
};

function useFake(current: Record<string, unknown> | null, rpcError?: { message: string }) {
  const fake = createFakeSupabase((q: FakeQuery): FakeResult => {
    if (q.table === "campaigns") return { data: { id: "camp-1", workspaceId: "workspace-a", brand: "Nike" } };
    if (q.table === "creators") return { data: { id: "c1", linkedUserId: "creator-1" } };
    if (q.table === "campaign_creators") return { data: { id: "cc-1" } };
    if (q.table === "deals") return { data: current };
    if (q.table === "deal_offers") return { data: [{ actor: "creator", event: "counter", amount: 18000, note: "", created_at: "2026-10-02T00:00:00Z" }] };
    return { data: null };
  }, () => (rpcError ? { data: null, error: rpcError } : { data: { ...deal, acceptanceStatus: "confirmed" }, error: null }));
  state.fake = fake;
  return fake;
}

const params = Promise.resolve({ id: "camp-1", creatorId: "c1" });
const request = (body?: unknown) => new Request("http://localhost/api/manager/campaigns/camp-1/creators/c1/deals/negotiation", body ? { method: "POST", body: JSON.stringify(body) } : {});

beforeEach(() => {
  state.access = { sub: "manager-1", email: "m@example.com" };
});

describe("GET manager negotiation", () => {
  it("returns the deal and its offer history", async () => {
    useFake(deal);
    const response = await GET(request(), { params });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.deal.acceptanceStatus).toBe("countered");
    expect(body.offers[0]).toMatchObject({ event: "counter", amount: 18000 });
  });

  it("returns an empty state when no assigned deal exists", async () => {
    useFake(null);
    const response = await GET(request(), { params });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deal: null, offers: [] });
  });
});

describe("POST manager confirm", () => {
  it("confirms a countered deal at the agreed amount", async () => {
    const fake = useFake(deal);
    const response = await POST(request({ action: "confirm", note: "Locked in" }), { params });
    expect(response.status).toBe(200);
    expect(fake.rpcCalls[0].args).toMatchObject({ p_expected_status: "countered", p_event: "accept", p_actor: "manager", p_note: "Locked in" });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ acceptanceStatus: "confirmed" });
  });

  it("refuses to accept on the creator's behalf once the deal is declined", async () => {
    const fake = useFake({ ...deal, acceptanceStatus: "declined" });
    const response = await POST(request({ action: "confirm" }), { params });
    expect(response.status).toBe(409);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("returns 409 when the status changed in the meantime", async () => {
    useFake(deal, { message: "status_changed" });
    const response = await POST(request({ action: "confirm" }), { params });
    expect(response.status).toBe(409);
  });
});

describe("manual deals (creator not linked)", () => {
  it("can be read by the manager", async () => {
    useFake({ ...deal, acceptanceStatus: "manual", user_id: null });
    const response = await GET(request(), { params });
    expect(response.status).toBe(200);
    expect((await response.json()).deal.acceptanceStatus).toBe("manual");
  });

  it("cannot be confirmed, since no creator has responded to them", async () => {
    const fake = useFake({ ...deal, acceptanceStatus: "manual", user_id: null });
    const response = await POST(request({ action: "confirm" }), { params });
    expect(response.status).toBe(409);
    expect(fake.rpcCalls).toHaveLength(0);
  });
});

