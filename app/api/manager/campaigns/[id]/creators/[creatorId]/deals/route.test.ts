import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeQuery, type FakeResult } from "@/lib/testing/fake-supabase";

const state = vi.hoisted(() => ({ fake: null as unknown, access: null as unknown }));
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: async () => state.access }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => state.fake }));

const { POST, PATCH, DELETE } = await import("./route");

const campaign = { id: "camp-1", workspaceId: "workspace-a", brand: "Nike" };
const linkedCreator = { id: "c1", linkedUserId: "user-9" };
const pendingDeal = {
  id: "deal-1", brand: "Nike", amount: 15000, dealDate: "2026-10-01", dueDate: "2999-01-01",
  contentCreated: true, sentToBrand: false, posted: false, moneyReceived: false,
  deliverables: [{ type: "Reel", quantity: 2, done: true }], notes: "",
  workspaceId: "workspace-a", campaignId: "camp-1", assignedByUserId: "manager-1",
  acceptanceStatus: "pending", user_id: "user-9",
};

function useFake(options: {
  deal?: Record<string, unknown> | null;
  offerError?: { message: string } | null;
  deleteRows?: unknown[];
  rpc?: FakeResult;
  creator?: { id: string; linkedUserId: string | null } | null;
}) {
  const fake = createFakeSupabase((q: FakeQuery): FakeResult => {
    if (q.table === "campaigns") return { data: campaign };
    if (q.table === "creators") return { data: options.creator === undefined ? linkedCreator : options.creator };
    if (q.table === "campaign_creators") return { data: { id: "cc-1" } };
    if (q.table === "deals") {
      if (q.op === "select") return { data: options.deal === undefined ? pendingDeal : options.deal };
      if (q.op === "insert") return { data: { id: "deal-new", ...q.payload }, error: null };
      if (q.op === "delete") return { data: options.deleteRows ?? [{ id: "deal-1" }], error: null };
    }
    if (q.table === "deal_offers") return { data: null, error: options.offerError ?? null };
    return { data: null, error: null };
  }, () => options.rpc ?? { data: { ...pendingDeal, acceptanceStatus: "pending" }, error: null });
  state.fake = fake;
  return fake;
}

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/manager/campaigns/camp-1/creators/c1/deals", body ? { method: "POST", body: JSON.stringify(body) } : { method: "DELETE" });
}
const params = Promise.resolve({ id: "camp-1", creatorId: "c1" });

beforeEach(() => {
  state.access = { sub: "manager-1", email: "m@example.com" };
});

describe("POST manager assigned deal", () => {
  it("rejects a note longer than 500 characters", async () => {
    useFake({});
    const response = await POST(makeRequest({ amount: 15000, dueDate: "2999-01-01", note: "x".repeat(501) }), { params });
    expect(response.status).toBe(400);
  });

  it("records a manual deal for a creator who has not linked an account, with no offer or notification", async () => {
    const fake = useFake({ creator: { id: "c1", linkedUserId: null }, deal: null });
    const response = await POST(makeRequest({ amount: 15000, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(200);
    const insert = fake.queries.find(q => q.table === "deals" && q.op === "insert");
    expect(insert?.payload).toMatchObject({ acceptanceStatus: "manual", user_id: null, creatorId: "c1", campaignId: "camp-1" });
    expect(fake.queries.some(q => q.table === "deal_offers")).toBe(false);
    expect(fake.queries.some(q => q.table === "notifications")).toBe(false);
  });

  it("creates a linked creator's deal as a created draft, with no offer, no notification, and no creator access yet", async () => {
    const fake = useFake({ deal: null });
    const response = await POST(makeRequest({ amount: 500, dueDate: "2999-01-01", note: "Please review" }), { params });
    expect(response.status).toBe(200);
    const insert = fake.queries.find(q => q.table === "deals" && q.op === "insert");
    expect(insert?.payload).toMatchObject({ acceptanceStatus: "draft", user_id: null, creatorId: "c1", campaignId: "camp-1" });
    expect(fake.queries.some(q => q.table === "deal_offers")).toBe(false);
    expect(fake.queries.some(q => q.table === "notifications")).toBe(false);
  });

  it("amends a manual deal without recording an offer or a negotiation event", async () => {
    const fake = useFake({ creator: { id: "c1", linkedUserId: null }, deal: { ...pendingDeal, acceptanceStatus: "manual", user_id: null } });
    const response = await POST(makeRequest({ amount: 18000, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(200);
    expect(fake.rpcCalls[0].args).toMatchObject({ p_expected_status: "manual", p_event: null, p_actor: null });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ amount: 18000, acceptanceStatus: "manual" });
    expect(fake.queries.some(q => q.table === "deal_offers")).toBe(false);
  });

  it("keeps a created draft as a draft when its details are saved", async () => {
    const fake = useFake({ deal: { ...pendingDeal, acceptanceStatus: "draft", user_id: null } });
    const response = await POST(makeRequest({ amount: 18000, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(200);
    expect(fake.rpcCalls[0].args).toMatchObject({ p_expected_status: "draft", p_event: null });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ amount: 18000, acceptanceStatus: "draft" });
    expect(fake.queries.some(q => q.table === "deal_offers")).toBe(false);
  });

  it("keeps the status and creator progress when re-saving without changing the amount", async () => {
    const fake = useFake({});
    const response = await POST(makeRequest({ amount: 15000, dueDate: "2999-01-01", deliverables: [{ type: "Reel", quantity: 2 }] }), { params });
    expect(response.status).toBe(200);
    const call = fake.rpcCalls[0];
    expect(call.args).toMatchObject({ p_expected_status: "pending", p_event: null, p_actor: null });
    const patch = call.args.p_patch as Record<string, unknown>;
    expect(patch).toMatchObject({ acceptanceStatus: "pending", brand: "Nike", deliverables: [{ type: "Reel", quantity: 2, done: true }] });
    expect(patch).not.toHaveProperty("dealDate");
    expect(patch).not.toHaveProperty("contentCreated");
  });

  it("sends a new offer when the amount changes while pending", async () => {
    const fake = useFake({});
    await POST(makeRequest({ amount: 18000, dueDate: "2999-01-01", note: "Bumped for the extra reel" }), { params });
    expect(fake.rpcCalls[0].args).toMatchObject({ p_event: "offer", p_actor: "manager", p_note: "Bumped for the extra reel", p_expected_status: "pending" });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ amount: 18000, acceptanceStatus: "pending" });
  });

  it("reopens a declined deal with a new offer", async () => {
    const fake = useFake({ deal: { ...pendingDeal, acceptanceStatus: "declined" } });
    const response = await POST(makeRequest({ amount: 15000, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(200);
    expect(fake.rpcCalls[0].args).toMatchObject({ p_expected_status: "declined", p_event: "offer" });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ acceptanceStatus: "pending" });
  });

  it("sends a new offer when the amount changes after the creator accepted", async () => {
    const fake = useFake({ deal: { ...pendingDeal, acceptanceStatus: "confirmed" } });
    const response = await POST(makeRequest({ amount: 18000, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(200);
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ acceptanceStatus: "pending" });
  });

  it("resets progress when the deliverable structure changes", async () => {
    const fake = useFake({});
    await POST(makeRequest({ amount: 15000, dueDate: "2999-01-01", deliverables: [{ type: "Post", quantity: 1 }] }), { params });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ deliverables: [{ type: "Post", quantity: 1, done: false }] });
  });

  it("returns a conflict when the status changed between read and write", async () => {
    useFake({ rpc: { data: null, error: { message: "status_changed" } } });
    const response = await POST(makeRequest({ amount: 18000, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(409);
  });
});

function makeSendRequest(body: unknown) {
  return new Request("http://localhost/api/manager/campaigns/camp-1/creators/c1/deals", { method: "PATCH", body: JSON.stringify(body) });
}

describe("PATCH send a created deal to the creator", () => {
  const draftDeal = { ...pendingDeal, acceptanceStatus: "draft", user_id: null };

  it("moves a created draft to pending, gives the linked creator access, and notifies them", async () => {
    const fake = useFake({ deal: draftDeal, rpc: { data: { ...draftDeal, acceptanceStatus: "pending", user_id: "user-9" }, error: null } });
    const response = await PATCH(makeSendRequest({ send: true, note: "Here is the offer" }), { params });
    expect(response.status).toBe(200);
    expect(fake.rpcCalls[0].args).toMatchObject({ p_expected_status: "draft", p_event: "offer", p_actor: "manager", p_note: "Here is the offer" });
    expect(fake.rpcCalls[0].args.p_patch).toMatchObject({ acceptanceStatus: "pending", user_id: "user-9" });
    const notification = fake.queries.find(q => q.table === "notifications" && q.op === "insert");
    expect(notification?.payload).toMatchObject({ userId: "user-9", dealId: "deal-1", kind: "deal_assigned", workspaceId: "workspace-a" });
  });

  it("refuses to send a deal that is no longer a created draft", async () => {
    const fake = useFake({ deal: { ...pendingDeal, acceptanceStatus: "pending" } });
    const response = await PATCH(makeSendRequest({ send: true }), { params });
    expect(response.status).toBe(409);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("refuses to send to a creator who has not linked an account", async () => {
    const fake = useFake({ deal: draftDeal, creator: { id: "c1", linkedUserId: null } });
    const response = await PATCH(makeSendRequest({ send: true }), { params });
    expect(response.status).toBe(400);
    expect(fake.rpcCalls).toHaveLength(0);
  });

  it("rejects a send value other than true", async () => {
    useFake({ deal: draftDeal });
    const response = await PATCH(makeSendRequest({ send: "yes" }), { params });
    expect(response.status).toBe(400);
  });
});

describe("DELETE manager assigned deal", () => {
  it("removes the creator's assignment", async () => {
    useFake({});
    const response = await DELETE(makeRequest(), { params });
    expect(response.status).toBe(200);
  });

  it("reports when there was nothing to remove", async () => {
    useFake({ deleteRows: [] });
    const response = await DELETE(makeRequest(), { params });
    expect(response.status).toBe(400);
  });
});
