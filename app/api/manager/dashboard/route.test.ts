import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockTerminal = vi.fn();
const supabaseChain = {
  select: () => supabaseChain,
  eq: () => supabaseChain,
  neq: () => supabaseChain,
  then: (resolve: (value: unknown) => void) => Promise.resolve(mockTerminal()).then(resolve),
};
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ from: () => supabaseChain }) }));

const { GET } = await import("./route");

function makeRequest(url: string) { return new Request(url); }

describe("GET /api/manager/dashboard", () => {
  beforeEach(() => { mockRequireWorkspaceAccess.mockReset(); mockTerminal.mockReset(); });

  it("rejects a request without workspace access", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await GET(makeRequest("http://localhost/api/manager/dashboard?workspaceId=workspace-a"));
    expect(response.status).toBe(401);
  });

  it("returns zeros for a brand-new workspace with no campaigns (empty-dataset support)", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockTerminal.mockResolvedValue({ count: 0, error: null });
    const response = await GET(makeRequest("http://localhost/api/manager/dashboard?workspaceId=workspace-a"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.metrics).toEqual({ totalCampaigns: 0, activeCampaigns: 0, totalCreators: 0, totalDeals: 0 });
  });

  it("reflects real campaign counts for the workspace", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockTerminal
      .mockResolvedValueOnce({ count: 3, error: null })
      .mockResolvedValueOnce({ count: 1, error: null })
      .mockResolvedValueOnce({ count: 2, error: null });
    const response = await GET(makeRequest("http://localhost/api/manager/dashboard?workspaceId=workspace-a"));
    const body = await response.json();
    expect(body.metrics.totalCampaigns).toBe(3);
    expect(body.metrics.activeCampaigns).toBe(1);
    expect(body.metrics.totalCreators).toBe(2);
  });
});
