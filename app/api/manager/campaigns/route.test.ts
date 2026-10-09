import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockInsert = vi.fn();
const mockOrder = vi.fn();
const mockMemberships = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "campaign_creators") return { select: () => ({ eq: () => mockMemberships() }) };
      const chain = {
        select: () => chain,
        eq: () => chain,
        neq: () => chain,
        order: (...args: unknown[]) => mockOrder(...args),
        insert: (...args: unknown[]) => mockInsert(...args),
      };
      return chain;
    },
  }),
}));

const { GET, POST } = await import("./route");

function makeRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

describe("GET /api/manager/campaigns", () => {
  beforeEach(() => { mockRequireWorkspaceAccess.mockReset(); mockOrder.mockReset(); mockMemberships.mockReset(); mockMemberships.mockResolvedValue({ data: [], error: null }); });

  it("rejects a request with no workspace access (cross-agency isolation)", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await GET(makeRequest("http://localhost/api/manager/campaigns?workspaceId=someone-elses-workspace"));
    expect(response.status).toBe(401);
  });

  it("rejects a request with no workspaceId at all", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await GET(makeRequest("http://localhost/api/manager/campaigns"));
    expect(response.status).toBe(401);
    expect(mockRequireWorkspaceAccess).toHaveBeenCalledWith("");
  });

  it("returns campaigns scoped to the authorized workspace", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockOrder.mockResolvedValue({ data: [{ id: "c1", workspaceId: "workspace-a" }], error: null });
    const response = await GET(makeRequest("http://localhost/api/manager/campaigns?workspaceId=workspace-a"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.campaigns).toHaveLength(1);
  });

  it("tallies creator counts per campaign from campaign_creators memberships", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockOrder.mockResolvedValue({ data: [{ id: "c1", workspaceId: "workspace-a" }, { id: "c2", workspaceId: "workspace-a" }], error: null });
    mockMemberships.mockResolvedValue({ data: [{ campaignId: "c1" }, { campaignId: "c1" }], error: null });
    const response = await GET(makeRequest("http://localhost/api/manager/campaigns?workspaceId=workspace-a"));
    const body = await response.json();
    expect(body.campaigns.find((c: { id: string }) => c.id === "c1").creatorCount).toBe(2);
    expect(body.campaigns.find((c: { id: string }) => c.id === "c2").creatorCount).toBe(0);
  });
});

describe("POST /api/manager/campaigns", () => {
  beforeEach(() => { mockRequireWorkspaceAccess.mockReset(); mockInsert.mockReset(); });

  const validBody = {
    workspaceId: "workspace-a",
    brand: "Nike",
    title: "Fall Drop",
    budget: 1000,
    currency: "INR",
    startDate: "2026-01-01",
    endDate: "2026-01-31",
    status: "draft",
  };

  it("rejects creation without workspace access (forged workspaceId defense)", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await POST(makeRequest("http://localhost/api/manager/campaigns", { method: "POST", body: JSON.stringify(validBody) }));
    expect(response.status).toBe(401);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects invalid campaign data even with valid workspace access", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const response = await POST(makeRequest("http://localhost/api/manager/campaigns", { method: "POST", body: JSON.stringify({ ...validBody, budget: -5 }) }));
    expect(response.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects an end date before the start date", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const response = await POST(makeRequest("http://localhost/api/manager/campaigns", {
      method: "POST",
      body: JSON.stringify({ ...validBody, startDate: "2026-02-01", endDate: "2026-01-01" }),
    }));
    expect(response.status).toBe(400);
  });

  it("creates a campaign for an authorized workspace", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const chain = { select: () => chain, single: () => Promise.resolve({ data: { id: "new-id", ...validBody }, error: null }) };
    mockInsert.mockReturnValue(chain);
    const response = await POST(makeRequest("http://localhost/api/manager/campaigns", { method: "POST", body: JSON.stringify(validBody) }));
    expect(response.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "workspace-a", createdBy: "user-1" }));
  });
});
