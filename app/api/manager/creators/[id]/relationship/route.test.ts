import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const supabaseChain = {
  select: () => supabaseChain,
  eq: () => supabaseChain,
  maybeSingle: () => mockMaybeSingle(),
  update: (...args: unknown[]) => mockUpdate(...args),
};
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ from: () => supabaseChain }) }));

const { POST } = await import("./route");

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/manager/creators/c1/relationship", { method: "POST", body: JSON.stringify(body ?? {}) });
}
const params = Promise.resolve({ id: "c1" });
const externalCreator = { id: "c1", workspaceId: "workspace-a", name: "Priya Sharma", status: "contact", relationship: "external", linkedUserId: null, archivedAt: null };
const linkedCreator = { ...externalCreator, status: "linked", linkedUserId: "creator-user-1" };
const manager = { sub: "user-1", email: "a@example.com", role: "owner" };

function stubUpdateSucceeds(row: Record<string, unknown>) {
  const chain = { eq: () => chain, select: () => chain, single: () => Promise.resolve({ data: row, error: null }) };
  mockUpdate.mockReturnValue(chain);
}

describe("POST /api/manager/creators/[id]/relationship", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); mockUpdate.mockReset(); });

  it("returns 404 for a creator in another agency's workspace, and changes nothing", async () => {
    mockMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await POST(makeRequest({ relationship: "managed" }), { params });
    expect(response.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects a relationship value outside managed and external", async () => {
    mockMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    const response = await POST(makeRequest({ relationship: "admin" }), { params });
    expect(response.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("refuses to make an unlinked creator managed, because managed creators need an account", async () => {
    mockMaybeSingle.mockResolvedValue({ data: externalCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    const response = await POST(makeRequest({ relationship: "managed" }), { params });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Link this creator/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("refuses to make an archived creator managed until they are restored", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...linkedCreator, archivedAt: "earlier" } });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    const response = await POST(makeRequest({ relationship: "managed" }), { params });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Restore this creator/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("makes a linked creator managed", async () => {
    mockMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    stubUpdateSucceeds({ ...linkedCreator, relationship: "managed" });
    const response = await POST(makeRequest({ relationship: "managed" }), { params });
    expect(response.status).toBe(200);
    expect((await response.json()).creator.relationship).toBe("managed");
    expect(mockUpdate).toHaveBeenCalledWith({ relationship: "managed" });
  });

  it("demotes a managed creator to external by updating only the relationship field", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...linkedCreator, relationship: "managed" } });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    stubUpdateSucceeds({ ...linkedCreator, relationship: "external" });
    const response = await POST(makeRequest({ relationship: "external" }), { params });
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ relationship: "external" });
  });

  it("returns the creator unchanged when it already has that relationship", async () => {
    mockMaybeSingle.mockResolvedValue({ data: externalCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    const response = await POST(makeRequest({ relationship: "external" }), { params });
    expect(response.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("maps the database's managed-needs-link check to a clear 400 if the route rules are bypassed", async () => {
    mockMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    const chain = { eq: () => chain, select: () => chain, single: () => Promise.resolve({ data: null, error: { code: "23514", message: "managed_creator_is_linked" } }) };
    mockUpdate.mockReturnValue(chain);
    const response = await POST(makeRequest({ relationship: "managed" }), { params });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Link this creator/);
  });
});
