import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeQuery, type FakeResult } from "@/lib/testing/fake-supabase";

const state = vi.hoisted(() => ({ fake: null as unknown, user: null as unknown }));
vi.mock("@/lib/auth/account", () => ({ requireCreator: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => state.fake }));

const { POST, GET } = await import("./route");

const baseDeal = {
  id: "deal-1", brand: "Nike", amount: 15000, dealDate: "2026-10-01", dueDate: "2999-01-01",
  contentCreated: false, sentToBrand: false, posted: false, moneyReceived: false,
  deliverables: [{ type: "Reel", quantity: 2, done: false }], notes: "",
  category: "", contactName: "", contactEmail: "", contactPhone: "", billingAddress: "",
  instagramUrl: null,
};
const assigned = {
  ...baseDeal, user_id: "creator-1", workspaceId: "ws-1", campaignId: "camp-1",
  assignedByUserId: "manager-1", acceptanceStatus: "accepted",
};

function useFake(existing: Record<string, unknown> | null, updateResult: FakeResult = { data: null }) {
  const fake = createFakeSupabase((q: FakeQuery): FakeResult => {
    if (q.table !== "deals") return { data: null };
    if (q.op === "select") return { data: existing };
    if (q.op === "update") return updateResult.data ? updateResult : { data: { ...assigned, ...q.payload }, error: null };
    if (q.op === "upsert") return { data: { ...baseDeal, ...q.payload }, error: null };
    return { data: null };
  });
  state.fake = fake;
  return fake;
}

function post(body: unknown) {
  return POST(new Request("http://localhost/api/deals", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  state.user = { sub: "creator-1", email: "c@example.com" };
});

describe("GET /api/deals for a creator", () => {
  it("requires a signed-in creator", async () => {
    state.user = null;
    state.fake = createFakeSupabase(() => ({ data: [] }));
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("reads the creator's own deals plus deals a manager added for a linked creator", async () => {
    const fake = createFakeSupabase((q: FakeQuery): FakeResult => {
      if (q.table === "creators") return { data: [{ id: "creator-record-1" }], error: null };
      return { data: [], error: null };
    });
    state.fake = fake;
    const response = await GET();
    expect(response.status).toBe(200);
    const dealQuery = fake.queries.find((q) => q.table === "deals" && q.op === "select");
    expect(dealQuery?.or).toBe("user_id.eq.creator-1,creatorId.in.(creator-record-1)");
    expect(fake.queries.find((q) => q.table === "creators")?.filters).toEqual({ linkedUserId: "creator-1" });
  });

  it("returns visible rows, leaving out drafts the manager has not sent", async () => {
    const mine = { ...baseDeal, user_id: "creator-1", acceptanceStatus: null };
    const sent = { ...baseDeal, id: "deal-3", user_id: null, creatorId: "creator-record-1", acceptanceStatus: "pending" };
    const draft = { ...baseDeal, id: "deal-4", user_id: null, creatorId: "creator-record-1", acceptanceStatus: "draft" };
    state.fake = createFakeSupabase((q: FakeQuery): FakeResult => {
      if (q.table === "creators") return { data: [{ id: "creator-record-1" }], error: null };
      return { data: [mine, sent, draft], error: null };
    });
    const body = await (await GET()).json();
    expect(body.deals.map((d: { id: string }) => d.id)).toEqual(["deal-1", "deal-3"]);
  });
});

describe("POST /api/deals for a creator", () => {
  it("saves an own unassigned deal with assignment columns forced to null", async () => {
    const fake = useFake(null);
    const response = await post({ ...baseDeal, campaignId: "camp-1", acceptanceStatus: "accepted", assignedByUserId: "x" });
    expect(response.status).toBe(200);
    const upsert = fake.queries.find(q => q.op === "upsert");
    expect(upsert?.payload).toMatchObject({ campaignId: null, workspaceId: null, assignedByUserId: null, acceptanceStatus: null, user_id: "creator-1" });
  });

  it("returns 403 when the deal belongs to another user", async () => {
    useFake({ ...baseDeal, user_id: "someone-else", campaignId: null });
    const response = await post(baseDeal);
    expect(response.status).toBe(403);
  });

  it("lets the creator update progress on an assigned deal", async () => {
    const fake = useFake(assigned);
    const response = await post({ ...assigned, contentCreated: true, deliverables: [{ type: "Reel", quantity: 2, done: true }] });
    expect(response.status).toBe(200);
    const update = fake.queries.find(q => q.op === "update");
    expect(update?.payload).toMatchObject({ contentCreated: true, deliverables: [{ type: "Reel", quantity: 2, done: true }] });
    expect(update?.payload).not.toHaveProperty("amount");
    expect(update?.payload).not.toHaveProperty("acceptanceStatus");
  });

  it("rejects a creator edit to a locked field on an assigned deal", async () => {
    const fake = useFake(assigned);
    const response = await post({ ...assigned, amount: 99999 });
    expect(response.status).toBe(400);
    expect(fake.queries.some(q => q.op === "update")).toBe(false);
  });

  it("rejects a creator edit that changes the deliverable structure", async () => {
    useFake(assigned);
    const response = await post({ ...assigned, deliverables: [{ type: "Post", quantity: 1, done: false }] });
    expect(response.status).toBe(400);
  });

  it("maps a delivery-order CHECK violation to a readable 400", async () => {
    const fake = createFakeSupabase((q: FakeQuery): FakeResult => {
      if (q.op === "select") return { data: null };
      return { data: null, error: { code: "23514", message: "new row violates check constraint" } };
    });
    state.fake = fake;
    const response = await post({ ...baseDeal, posted: true, sentToBrand: false });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("in order") });
  });
});
