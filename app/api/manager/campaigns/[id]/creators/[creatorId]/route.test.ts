import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockCampaignMaybeSingle = vi.fn();
const mockDeleteSelect = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "campaigns") return { select: () => ({ eq: () => ({ maybeSingle: () => mockCampaignMaybeSingle() }) }) };
      return { delete: () => ({ eq: () => ({ eq: () => ({ select: () => mockDeleteSelect() }) }) }) };
    },
  }),
}));

const { DELETE } = await import("./route");

function makeRequest() { return new Request("http://localhost/api/manager/campaigns/camp-1/creators/c1", { method: "DELETE" }); }
const params = Promise.resolve({ id: "camp-1", creatorId: "c1" });
const existingCampaign = { id: "camp-1", workspaceId: "workspace-a" };

describe("DELETE /api/manager/campaigns/[id]/creators/[creatorId]", () => {
  beforeEach(() => { mockCampaignMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); mockDeleteSelect.mockReset(); });

  it("returns 404 for a campaign that doesn't exist", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: null });
    const response = await DELETE(makeRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for a campaign in another agency's workspace", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await DELETE(makeRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("rejects removing a creator that isn't on the campaign", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockDeleteSelect.mockResolvedValue({ data: [], error: null });
    const response = await DELETE(makeRequest(), { params });
    expect(response.status).toBe(400);
  });

  it("removes the creator from the campaign", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockDeleteSelect.mockResolvedValue({ data: [{ id: "cc-1" }], error: null });
    const response = await DELETE(makeRequest(), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
