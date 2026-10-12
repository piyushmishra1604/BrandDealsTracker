import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeQuery, type FakeResult } from "@/lib/testing/fake-supabase";
import { hashInvitationToken } from "@/lib/creator-invitations";

const state = vi.hoisted(() => ({
  fake: null as unknown,
  access: null as unknown,
}));
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: async () => state.access }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => state.fake }));

const { GET, POST, DELETE } = await import("./route");

const params = Promise.resolve({ id: "creator-1" });
const url = "http://localhost/api/manager/creators/creator-1/invitations";
const creator = { id: "creator-1", workspaceId: "ws-a", name: "Kopal", email: "kopal@example.com", status: "contact", linkedUserId: null, archivedAt: null };

let creatorRow: unknown;
let pendingRow: unknown;
let insertError: { code?: string; message: string } | null;
let revokedRows: { id: string }[];
let queries: FakeQuery[];

function setFake(handler: (q: FakeQuery) => FakeResult) {
  const fake = createFakeSupabase(handler);
  state.fake = fake;
  queries = fake.queries;
}

beforeEach(() => {
  state.access = { sub: "manager-1", email: "m@example.com", role: "manager" };
  creatorRow = creator;
  pendingRow = null;
  insertError = null;
  revokedRows = [];
  setFake((q) => {
    if (q.table === "creators") return { data: creatorRow };
    if (q.table === "creator_invitations" && q.op === "select") return { data: pendingRow };
    if (q.table === "creator_invitations" && q.op === "update") return { data: revokedRows };
    if (q.table === "creator_invitations" && q.op === "insert") {
      return insertError ? { data: null, error: insertError } : { data: { id: "inv-1", email: "kopal@example.com", status: "pending", expiresAt: "2026-10-20T00:00:00.000Z", created_at: "2026-10-13T00:00:00.000Z" } };
    }
    return { data: null };
  });
});

describe("POST /api/manager/creators/[id]/invitations", () => {
  it("returns 404 for a creator that doesn't exist", async () => {
    creatorRow = null;
    const response = await POST(new Request(url, { method: "POST" }), { params });
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for a creator in another agency", async () => {
    state.access = null;
    const response = await POST(new Request(url, { method: "POST" }), { params });
    expect(response.status).toBe(404);
  });

  it("refuses an archived creator", async () => {
    creatorRow = { ...creator, archivedAt: "2026-10-01T00:00:00.000Z" };
    const response = await POST(new Request(url, { method: "POST" }), { params });
    expect(response.status).toBe(400);
  });

  it("refuses a creator who is already linked", async () => {
    creatorRow = { ...creator, status: "linked", linkedUserId: "user-9" };
    const response = await POST(new Request(url, { method: "POST" }), { params });
    expect(response.status).toBe(400);
    expect(queries.some((q) => q.op === "insert")).toBe(false);
  });

  it("refuses a creator with no email address", async () => {
    creatorRow = { ...creator, email: null };
    const response = await POST(new Request(url, { method: "POST" }), { params });
    expect(response.status).toBe(400);
  });

  it("revokes the previous pending link before issuing a new one", async () => {
    await POST(new Request(url, { method: "POST" }), { params });
    const revoke = queries.find((q) => q.op === "update");
    const insert = queries.find((q) => q.op === "insert");
    expect(revoke?.payload).toEqual({ status: "revoked" });
    expect(revoke?.filters).toEqual({ creatorId: "creator-1", status: "pending" });
    expect(queries.indexOf(revoke!)).toBeLessThan(queries.indexOf(insert!));
  });

  it("returns the link once and stores only its hash", async () => {
    const response = await POST(new Request(url, { method: "POST" }), { params });
    const body = await response.json();
    expect(response.status).toBe(201);
    const token = new URL(body.url).searchParams.get("token");
    expect(token).toBeTruthy();
    expect(body.url.startsWith("http://localhost/invite?token=")).toBe(true);

    const insert = queries.find((q) => q.op === "insert");
    expect(insert?.payload?.tokenHash).toBe(hashInvitationToken(token!));
    expect(JSON.stringify(insert?.payload)).not.toContain(token!);
    expect(insert?.payload).toMatchObject({ workspaceId: "ws-a", creatorId: "creator-1", email: "kopal@example.com", createdByUserId: "manager-1" });
    expect(body.invitation).not.toHaveProperty("tokenHash");
  });

  it("reports a clash from a concurrent issue as a conflict", async () => {
    insertError = { code: "23505", message: "duplicate key" };
    const response = await POST(new Request(url, { method: "POST" }), { params });
    expect(response.status).toBe(409);
  });
});

describe("GET /api/manager/creators/[id]/invitations", () => {
  it("returns null when no link is pending", async () => {
    const response = await GET(new Request(url), { params });
    expect(await response.json()).toEqual({ invitation: null });
  });

  it("never returns the token and marks a lapsed link as expired", async () => {
    pendingRow = { id: "inv-1", email: "kopal@example.com", expiresAt: "2000-01-01T00:00:00.000Z", created_at: "1999-12-25T00:00:00.000Z" };
    const response = await GET(new Request(url), { params });
    const body = await response.json();
    expect(body.invitation.status).toBe("expired");
    expect(JSON.stringify(body)).not.toMatch(/token/i);
  });

  it("returns 404 for a creator in another agency", async () => {
    state.access = null;
    const response = await GET(new Request(url), { params });
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/manager/creators/[id]/invitations", () => {
  it("revokes the pending link", async () => {
    revokedRows = [{ id: "inv-1" }];
    const response = await DELETE(new Request(url, { method: "DELETE" }), { params });
    expect(response.status).toBe(200);
    expect(queries.find((q) => q.op === "update")?.payload).toEqual({ status: "revoked" });
  });

  it("returns 404 when there is nothing to cancel", async () => {
    revokedRows = [];
    const response = await DELETE(new Request(url, { method: "DELETE" }), { params });
    expect(response.status).toBe(404);
  });
});
