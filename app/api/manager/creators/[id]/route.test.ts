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

const { GET, PATCH } = await import("./route");

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/manager/creators/c1", body ? { method: "PATCH", body: JSON.stringify(body) } : undefined);
}
const params = Promise.resolve({ id: "c1" });
const existingCreator = { id: "c1", workspaceId: "workspace-a", name: "Ankita Rath", status: "contact" };

describe("GET /api/manager/creators/[id]", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); });

  it("returns 404 (not 401/403) for a creator that doesn't exist", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    const response = await GET(makeRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for a creator in another agency's workspace", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await GET(makeRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("returns the creator for an authorized workspace member", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const response = await GET(makeRequest(), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.creator.id).toBe("c1");
  });
});

describe("PATCH /api/manager/creators/[id]", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); mockUpdate.mockReset(); });

  it("rejects an update to a creator in another agency's workspace", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await PATCH(makeRequest({ name: "Someone Else" }), { params });
    expect(response.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects a merged result that fails validation", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const response = await PATCH(makeRequest({ name: "" }), { params });
    expect(response.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates a creator's contact info via a partial update", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const chain = { eq: () => chain, select: () => chain, single: () => Promise.resolve({ data: { ...existingCreator, email: "new@example.com" }, error: null }) };
    mockUpdate.mockReturnValue(chain);
    const response = await PATCH(makeRequest({ email: "new@example.com" }), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.creator.email).toBe("new@example.com");
  });
});
