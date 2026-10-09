import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockInsert = vi.fn();
const mockOrder = vi.fn();
const supabaseChain = {
  select: () => supabaseChain,
  eq: () => supabaseChain,
  order: (...args: unknown[]) => mockOrder(...args),
  insert: (...args: unknown[]) => mockInsert(...args),
};
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ from: () => supabaseChain }) }));

const { GET, POST } = await import("./route");

function makeRequest(url: string, init?: RequestInit) { return new Request(url, init); }

describe("GET /api/manager/creators", () => {
  beforeEach(() => { mockRequireWorkspaceAccess.mockReset(); mockOrder.mockReset(); });

  it("rejects a request with no workspace access (cross-agency isolation)", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await GET(makeRequest("http://localhost/api/manager/creators?workspaceId=someone-elses-workspace"));
    expect(response.status).toBe(401);
  });

  it("returns creators scoped to the authorized workspace", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockOrder.mockResolvedValue({ data: [{ id: "c1", workspaceId: "workspace-a" }], error: null });
    const response = await GET(makeRequest("http://localhost/api/manager/creators?workspaceId=workspace-a"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.creators).toHaveLength(1);
  });
});

describe("POST /api/manager/creators", () => {
  beforeEach(() => { mockRequireWorkspaceAccess.mockReset(); mockInsert.mockReset(); });

  const validBody = { workspaceId: "workspace-a", name: "Ankita Rath" };

  it("rejects creation without workspace access (forged workspaceId defense)", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await POST(makeRequest("http://localhost/api/manager/creators", { method: "POST", body: JSON.stringify(validBody) }));
    expect(response.status).toBe(401);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects invalid creator data even with valid workspace access", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const response = await POST(makeRequest("http://localhost/api/manager/creators", { method: "POST", body: JSON.stringify({ workspaceId: "workspace-a", name: "" }) }));
    expect(response.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("creates a creator for an authorized workspace", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const chain = { select: () => chain, single: () => Promise.resolve({ data: { id: "new-id", ...validBody }, error: null }) };
    mockInsert.mockReturnValue(chain);
    const response = await POST(makeRequest("http://localhost/api/manager/creators", { method: "POST", body: JSON.stringify(validBody) }));
    expect(response.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "workspace-a", createdBy: "user-1" }));
  });
});
