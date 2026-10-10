import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockCampaignMaybeSingle = vi.fn();
const mockCreatorMaybeSingle = vi.fn();
const mockMembershipMaybeSingle = vi.fn();
const mockExistingDealMaybeSingle = vi.fn();
const mockUpdateSingle = vi.fn();
const mockInsertSingle = vi.fn();
const mockDeleteSelect = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "campaigns") return { select: () => ({ eq: () => ({ maybeSingle: () => mockCampaignMaybeSingle() }) }) };
      if (table === "creators") return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => mockCreatorMaybeSingle() }) }) }) };
      if (table === "campaign_creators") return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => mockMembershipMaybeSingle() }) }) }) };
      // deals: used for the existing-deal lookup, update, insert, and delete paths.
      return {
        select: (columns: string) => {
          if (columns === "id") return { eq: () => ({ eq: () => ({ maybeSingle: () => mockExistingDealMaybeSingle() }) }) };
          return { eq: () => ({ single: () => mockUpdateSingle() }) };
        },
        update: () => ({ eq: () => ({ select: () => ({ single: () => mockUpdateSingle() }) }) }),
        insert: () => ({ select: () => ({ single: () => mockInsertSingle() }) }),
        delete: () => ({ eq: () => ({ eq: () => ({ select: () => mockDeleteSelect() }) }) }),
      };
    },
  }),
}));

const { POST, DELETE } = await import("./route");

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/manager/campaigns/camp-1/creators/c1/deals", body ? { method: "POST", body: JSON.stringify(body) } : { method: "DELETE" });
}
const params = Promise.resolve({ id: "camp-1", creatorId: "c1" });
const existingCampaign = { id: "camp-1", workspaceId: "workspace-a", brand: "Nike" };
const linkedCreator = { id: "c1", linkedUserId: "user-9" };
const unlinkedCreator = { id: "c1", linkedUserId: null };

function resetAll() {
  mockCampaignMaybeSingle.mockReset();
  mockCreatorMaybeSingle.mockReset();
  mockMembershipMaybeSingle.mockReset();
  mockExistingDealMaybeSingle.mockReset();
  mockUpdateSingle.mockReset();
  mockInsertSingle.mockReset();
  mockDeleteSelect.mockReset();
  mockRequireWorkspaceAccess.mockReset();
}

describe("POST /api/manager/campaigns/[id]/creators/[creatorId]/deals", () => {
  beforeEach(resetAll);

  it("returns 404 for a campaign that doesn't exist", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: null });
    const response = await POST(makeRequest({ amount: 100, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for a campaign in another agency's workspace", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await POST(makeRequest({ amount: 100, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(404);
  });

  it("returns 404 when the creator isn't a member of this campaign", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockMembershipMaybeSingle.mockResolvedValue({ data: null });
    const response = await POST(makeRequest({ amount: 100, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(404);
  });

  it("rejects assigning a deal to a creator who isn't linked to a real account", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: unlinkedCreator });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: "cc-1" } });
    const response = await POST(makeRequest({ amount: 100, dueDate: "2999-01-01" }), { params });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toMatch(/link/i);
  });

  it("rejects invalid deal data", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: "cc-1" } });
    const response = await POST(makeRequest({ amount: -5, dueDate: "2999-01-01" }), { params });
    expect(response.status).toBe(400);
  });

  it("rejects a due date before today", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: "cc-1" } });
    const response = await POST(makeRequest({ amount: 100, dueDate: "2000-01-01" }), { params });
    expect(response.status).toBe(400);
  });

  it("inserts a new assigned deal when none exists yet", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: "cc-1" } });
    mockExistingDealMaybeSingle.mockResolvedValue({ data: null });
    mockInsertSingle.mockResolvedValue({ data: { id: "deal-1", amount: 500, acceptanceStatus: "pending" }, error: null });
    const response = await POST(makeRequest({ amount: 500, dueDate: "2999-01-01" }), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.deal.id).toBe("deal-1");
    expect(mockUpdateSingle).not.toHaveBeenCalled();
  });

  it("updates the existing assigned deal instead of creating a duplicate", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: "cc-1" } });
    mockExistingDealMaybeSingle.mockResolvedValue({ data: { id: "deal-1" } });
    mockUpdateSingle.mockResolvedValue({ data: { id: "deal-1", amount: 750, acceptanceStatus: "pending" }, error: null });
    const response = await POST(makeRequest({ amount: 750, dueDate: "2999-01-01" }), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.deal.amount).toBe(750);
    expect(mockInsertSingle).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/manager/campaigns/[id]/creators/[creatorId]/deals", () => {
  beforeEach(resetAll);

  it("returns the same 404 for a campaign in another agency's workspace", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await DELETE(makeRequest(), { params });
    expect(response.status).toBe(404);
  });

  it("rejects removal for a creator who isn't linked (no deal could exist)", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: unlinkedCreator });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: "cc-1" } });
    const response = await DELETE(makeRequest(), { params });
    expect(response.status).toBe(400);
  });

  it("removes the assigned deal", async () => {
    mockCampaignMaybeSingle.mockResolvedValue({ data: existingCampaign });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockCreatorMaybeSingle.mockResolvedValue({ data: linkedCreator });
    mockMembershipMaybeSingle.mockResolvedValue({ data: { id: "cc-1" } });
    mockDeleteSelect.mockResolvedValue({ data: [{ id: "deal-1" }], error: null });
    const response = await DELETE(makeRequest(), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
  });
});
