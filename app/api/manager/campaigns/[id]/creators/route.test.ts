import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockCampaignMaybeSingle = vi.fn();
const mockCreatorMaybeSingle = vi.fn();
const mockEntriesOrder = vi.fn();
const mockInsertSingle = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "campaigns") return { select: () => ({ eq: () => ({ maybeSingle: () => mockCampaignMaybeSingle() }) }) };
      if (table === "creators") return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => mockCreatorMaybeSingle() }) }) }) };
      return {
        select: () => ({ eq: () => ({ order: () => mockEntriesOrder() }) }),
        insert: () => ({ select: () => ({ single: () => mockInsertSingle() }) }),
      };
    },
  }),
}));

const { GET, POST } = await import("./route");

function makeGetRequest() { return new Request("http://localhost/api/manager/campaigns/camp-1/creators"); }
function makePostRequest(body: unknown) { return new Request("http://localhost/api/manager/campaigns/camp-1/creators", { method: "POST", body: JSON.stringify(body) }); }
const params = Promise.resolve({ id: "camp-1" });
const existingCampaign = { id: "camp-1", workspaceId: "workspace-a" };

describe("GET /api/manager/campaigns/[id]/creators", () => {
  beforeEach(() => { mockCampaignMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); mockEntriesOrder.mockReset(); });

  it("returns 404 for a campaign that doesn't exist", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: null });
    const response = await GET(makeGetRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for a campaign in another agency's workspace", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await GET(makeGetRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("returns the campaign's assigned creators for an authorized workspace member", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockEntriesOrder.mockResolvedValue({ data: [{ id: "cc-1", campaignId: "camp-1", creatorId: "c1" }], error: null });
    const response = await GET(makeGetRequest(), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.entries).toHaveLength(1);
  });
});

describe("POST /api/manager/campaigns/[id]/creators", () => {
  beforeEach(() => {
    mockCampaignMaybeSingle.mockReset();
    mockRequireWorkspaceAccess.mockReset();
    mockCreatorMaybeSingle.mockReset();
    mockInsertSingle.mockReset();
  });

  it("rejects a request missing the creator id", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const response = await POST(makePostRequest({}), { params });
    expect(response.status).toBe(400);
  });

  it("rejects a creator id that doesn't belong to the campaign's workspace", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: null });
    const response = await POST(makePostRequest({ creatorId: "c-other-workspace" }), { params });
    expect(response.status).toBe(404);
    expect(mockInsertSingle).not.toHaveBeenCalled();
  });

  it("rejects adding a creator that's already on the campaign (duplicate)", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: { id: "c1" } });
    mockInsertSingle.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate" } });
    const response = await POST(makePostRequest({ creatorId: "c1" }), { params });
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).toMatch(/already/i);
  });

  it("adds a creator to the campaign", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: { id: "c1" } });
    mockInsertSingle.mockResolvedValue({ data: { id: "cc-1", campaignId: "camp-1", creatorId: "c1" }, error: null });
    const response = await POST(makePostRequest({ creatorId: "c1" }), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.entry.creatorId).toBe("c1");
  });
});
