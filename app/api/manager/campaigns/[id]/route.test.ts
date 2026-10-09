import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockCreatorCountEq = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "campaign_creators") return { select: () => ({ eq: () => mockCreatorCountEq() }) };
      const chain = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: () => mockMaybeSingle(),
        update: (...args: unknown[]) => mockUpdate(...args),
      };
      return chain;
    },
  }),
}));

const { GET, PATCH } = await import("./route");

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/manager/campaigns/c1", body ? { method: "PATCH", body: JSON.stringify(body) } : undefined);
}
const params = Promise.resolve({ id: "c1" });

const existingCampaign = {
  id: "c1", workspaceId: "workspace-a", brand: "Nike", title: "Fall Drop", budget: 1000,
  currency: "INR", startDate: "2026-01-01", endDate: "2026-01-31", status: "draft",
};

describe("GET /api/manager/campaigns/[id]", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); mockCreatorCountEq.mockReset(); mockCreatorCountEq.mockResolvedValue({ count: 0 }); });

  it("returns 404 (not 401/403) for a campaign that doesn't exist, to avoid confirming IDs", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    const response = await GET(makeRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for a campaign that exists but belongs to another agency", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue(null); // not a member of workspace-a
    const response = await GET(makeRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("returns the campaign with its real creator count for an authorized workspace member", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockCreatorCountEq.mockResolvedValue({ count: 2 });
    const response = await GET(makeRequest(), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.campaign.id).toBe("c1");
    expect(body.campaign.creatorCount).toBe(2);
  });
});

describe("PATCH /api/manager/campaigns/[id]", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); mockUpdate.mockReset(); });

  it("rejects an update to a campaign in another agency's workspace", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await PATCH(makeRequest({ status: "archived" }), { params });
    expect(response.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("archives via a partial update without requiring the full form again", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const chain = { eq: () => chain, select: () => chain, single: () => Promise.resolve({ data: { ...existingCampaign, status: "archived" }, error: null }) };
    mockUpdate.mockReturnValue(chain);
    const response = await PATCH(makeRequest({ status: "archived" }), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.campaign.status).toBe("archived");
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "archived", brand: "Nike" }));
  });

  it("rejects a merged result that fails validation", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const response = await PATCH(makeRequest({ budget: -100 }), { params });
    expect(response.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
