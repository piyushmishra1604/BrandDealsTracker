import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockCreatorMaybeSingle = vi.fn();
const mockDealsOrder = vi.fn();
const mockDealsEq = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "creators") return { select: () => ({ eq: () => ({ maybeSingle: () => mockCreatorMaybeSingle() }) }) };
      return { select: () => ({ eq: (...args: unknown[]) => { mockDealsEq(...args); return { order: () => mockDealsOrder() }; } }) };
    },
  }),
}));

const { GET } = await import("./route");

function makeRequest() { return new Request("http://localhost/api/manager/creators/c1/deals"); }
const params = Promise.resolve({ id: "c1" });
const existingCreator = { id: "c1", workspaceId: "workspace-a" };
const owner = { sub: "user-1", email: "a@example.com", role: "owner" };

describe("GET /api/manager/creators/[id]/deals", () => {
  beforeEach(() => { mockCreatorMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); mockDealsOrder.mockReset(); mockDealsEq.mockClear(); });

  it("returns 404 for a creator that doesn't exist", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: null });
    const response = await GET(makeRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for a creator in another agency's workspace", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await GET(makeRequest(), { params });
    expect(response.status).toBe(404);
    expect(mockDealsOrder).not.toHaveBeenCalled();
  });

  it("returns deals with a summary split into active and completed", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(owner);
    mockDealsOrder.mockResolvedValue({
      data: [
        { id: "d1", amount: 18000, acceptanceStatus: "confirmed", moneyReceived: false, campaignId: "camp-1", campaign: { id: "camp-1", title: "Spring Drop", brand: "Nike", status: "active" } },
        { id: "d2", amount: 9000, acceptanceStatus: "pending", moneyReceived: false, campaignId: null, campaign: null },
        { id: "d3", amount: 4000, acceptanceStatus: "confirmed", moneyReceived: true, campaignId: "camp-1", campaign: { id: "camp-1", title: "Spring Drop", brand: "Nike", status: "active" } },
      ],
      error: null,
    });
    const response = await GET(makeRequest(), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.deals).toHaveLength(3);
    expect(body.deals[0].campaign.title).toBe("Spring Drop");
    expect(body.summary).toEqual({ activeCount: 2, activeValue: 18000, completedCount: 1, completedValue: 4000 });
  });

  it("lists only deals attached to this creator, never a creator's personal deals", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(owner);
    mockDealsOrder.mockResolvedValue({ data: [], error: null });
    await GET(makeRequest(), { params });
    expect(mockDealsEq).toHaveBeenCalledWith("creatorId", "c1");
  });

  it("returns an empty summary when the creator has no deals", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(owner);
    mockDealsOrder.mockResolvedValue({ data: [], error: null });
    const response = await GET(makeRequest(), { params });
    const body = await response.json();
    expect(body.deals).toEqual([]);
    expect(body.summary).toEqual({ activeCount: 0, activeValue: 0, completedCount: 0, completedValue: 0 });
  });

  it("returns 500 when the deals query fails", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(owner);
    mockDealsOrder.mockResolvedValue({ data: null, error: { message: "boom" } });
    const response = await GET(makeRequest(), { params });
    expect(response.status).toBe(500);
  });
});
