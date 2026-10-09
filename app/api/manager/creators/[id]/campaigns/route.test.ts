import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockCreatorMaybeSingle = vi.fn();
const mockEntriesOrder = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "creators") return { select: () => ({ eq: () => ({ maybeSingle: () => mockCreatorMaybeSingle() }) }) };
      return { select: () => ({ eq: () => ({ order: () => mockEntriesOrder() }) }) };
    },
  }),
}));

const { GET } = await import("./route");

function makeRequest() { return new Request("http://localhost/api/manager/creators/c1/campaigns"); }
const params = Promise.resolve({ id: "c1" });
const existingCreator = { id: "c1", workspaceId: "workspace-a" };

describe("GET /api/manager/creators/[id]/campaigns", () => {
  beforeEach(() => { mockCreatorMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); mockEntriesOrder.mockReset(); });

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
  });

  it("returns the creator's campaign memberships for an authorized workspace member", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockEntriesOrder.mockResolvedValue({ data: [{ id: "cc-1", campaignId: "camp-1", creatorId: "c1", campaign: { id: "camp-1", title: "Spring Drop", brand: "Nike", status: "active" } }], error: null });
    const response = await GET(makeRequest(), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].campaign.title).toBe("Spring Drop");
  });
});
