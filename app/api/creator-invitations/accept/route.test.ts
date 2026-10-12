import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeQuery, type FakeResult } from "@/lib/testing/fake-supabase";

const state = vi.hoisted(() => ({
  fake: null as unknown,
  user: null as unknown,
}));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => state.fake }));

const mockActivateManualDeals = vi.fn();
vi.mock("@/lib/manual-deals", () => ({ activateManualDeals: (...args: unknown[]) => mockActivateManualDeals(...args) }));

const { POST } = await import("./route");

const FUTURE = "2999-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";
const TOKEN = "valid-token";

let account: unknown;
let invitation: unknown;
let creator: unknown;
let alreadyLinked: unknown;
let claimRows: { id: string }[];
let linkError: { message: string } | null;
let queries: FakeQuery[];

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/creator-invitations/accept", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  state.user = { sub: "user-kopal", email: "kopal@example.com" };
  account = { id: "user-kopal", email: "kopal@example.com", account_type: "creator" };
  invitation = { id: "inv-1", creatorId: "creator-1", email: "kopal@example.com", status: "pending", expiresAt: FUTURE, acceptedByUserId: null };
  creator = { id: "creator-1", workspaceId: "ws-a", linkedUserId: null, archivedAt: null };
  alreadyLinked = null;
  claimRows = [{ id: "inv-1" }];
  linkError = null;
  mockActivateManualDeals.mockReset();
  mockActivateManualDeals.mockResolvedValue({ ok: true, value: { activated: 1 } });

  const fake = createFakeSupabase((q: FakeQuery): FakeResult => {
    if (q.table === "app_users") return { data: account };
    if (q.table === "creator_invitations" && q.op === "select") return { data: invitation };
    if (q.table === "creator_invitations" && q.op === "update") {
      if (q.payload?.status === "accepted") return { data: claimRows };
      return { data: [{ id: "inv-1" }] };
    }
    if (q.table === "creators" && q.op === "select") {
      // The "already linked elsewhere" check is the only creators query that excludes an id.
      if (Object.keys(q.notEquals).length > 0) return { data: alreadyLinked };
      return { data: creator };
    }
    if (q.table === "creators" && q.op === "update") return linkError ? { data: null, error: linkError } : { data: [{ id: "creator-1" }] };
    return { data: null };
  });
  state.fake = fake;
  queries = fake.queries;
});

describe("POST /api/creator-invitations/accept", () => {
  it("requires a signed-in account", async () => {
    state.user = null;
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(401);
  });

  it("rejects a manager account", async () => {
    account = { id: "user-kopal", email: "kopal@example.com", account_type: "manager" };
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(403);
    expect(queries.some((q) => q.op === "update")).toBe(false);
  });

  it("rejects a missing token", async () => {
    const response = await POST(makeRequest({}));
    expect(response.status).toBe(400);
  });

  it("returns 404 for a token that matches no invitation", async () => {
    invitation = null;
    const response = await POST(makeRequest({ token: "unknown" }));
    expect(response.status).toBe(404);
  });

  it("refuses an invitation that was already used by someone else", async () => {
    invitation = { ...(invitation as object), status: "accepted", acceptedByUserId: "user-other" };
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(409);
    expect(mockActivateManualDeals).not.toHaveBeenCalled();
  });

  it("refuses a revoked invitation", async () => {
    invitation = { ...(invitation as object), status: "revoked" };
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(410);
  });

  it("refuses an expired invitation and marks it expired", async () => {
    invitation = { ...(invitation as object), expiresAt: PAST };
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(410);
    const mark = queries.find((q) => q.op === "update");
    expect(mark?.payload).toEqual({ status: "expired" });
    expect(mockActivateManualDeals).not.toHaveBeenCalled();
  });

  it("refuses when the signed-in account has a different email", async () => {
    account = { id: "user-kopal", email: "someone-else@example.com", account_type: "creator" };
    const response = await POST(makeRequest({ token: TOKEN }));
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).not.toContain("kopal@example.com");
    expect(queries.some((q) => q.op === "update")).toBe(false);
  });

  it("accepts an email that differs only by case", async () => {
    account = { id: "user-kopal", email: "Kopal@Example.com", account_type: "creator" };
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(200);
  });

  it("refuses an invitation for an archived contact", async () => {
    creator = { ...(creator as object), archivedAt: "2026-10-01T00:00:00.000Z" };
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(410);
  });

  it("refuses a contact already linked to a different account", async () => {
    creator = { ...(creator as object), linkedUserId: "user-other", status: "linked" };
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(409);
  });

  it("refuses an account already linked to another contact in the workspace", async () => {
    alreadyLinked = { id: "creator-2" };
    const response = await POST(makeRequest({ token: TOKEN }));
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).not.toMatch(/Kopal|creator-2/);
  });

  it("loses cleanly to a concurrent acceptance and doesn't link", async () => {
    claimRows = [];
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(409);
    expect(queries.some((q) => q.table === "creators" && q.op === "update")).toBe(false);
    expect(mockActivateManualDeals).not.toHaveBeenCalled();
  });

  it("claims the invitation, links the contact, and converts manual deals", async () => {
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(200);

    const claim = queries.find((q) => q.op === "update" && q.payload?.status === "accepted");
    expect(claim?.filters).toEqual({ id: "inv-1", status: "pending" });
    expect(claim?.payload).toMatchObject({ acceptedByUserId: "user-kopal" });

    const link = queries.find((q) => q.table === "creators" && q.op === "update");
    expect(link?.payload).toEqual({ linkedUserId: "user-kopal", status: "linked" });
    expect(link?.filters).toEqual({ id: "creator-1" });
    expect(mockActivateManualDeals).toHaveBeenCalledWith(expect.anything(), { creatorId: "creator-1", linkedUserId: "user-kopal" });
  });

  it("releases the claim if linking fails, so the link can be retried", async () => {
    linkError = { message: "db down" };
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(500);
    const release = queries.filter((q) => q.op === "update" && q.payload?.status === "pending").pop();
    expect(release?.payload).toEqual({ status: "pending", acceptedAt: null, acceptedByUserId: null });
    expect(release?.filters).toEqual({ id: "inv-1", acceptedByUserId: "user-kopal" });
    expect(mockActivateManualDeals).not.toHaveBeenCalled();
  });

  it("lets the same account retry only the deal conversion after a partial failure", async () => {
    invitation = { ...(invitation as object), status: "accepted", acceptedByUserId: "user-kopal" };
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(200);
    expect(mockActivateManualDeals).toHaveBeenCalledWith(expect.anything(), { creatorId: "creator-1", linkedUserId: "user-kopal" });
    expect(queries.some((q) => q.op === "update")).toBe(false);
  });

  it("reports a failed deal conversion without undoing the link", async () => {
    mockActivateManualDeals.mockResolvedValue({ ok: false, status: 500, error: "boom" });
    const response = await POST(makeRequest({ token: TOKEN }));
    expect(response.status).toBe(500);
    expect(queries.some((q) => q.table === "creators" && q.op === "update")).toBe(true);
    expect(queries.find((q) => q.op === "update" && q.payload?.status === "pending")).toBeUndefined();
  });
});
