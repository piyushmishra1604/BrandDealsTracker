import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockInsert = vi.fn();
const mockOrder = vi.fn();
const creatorsChain = {
  select: () => creatorsChain,
  eq: () => creatorsChain,
  order: (...args: unknown[]) => mockOrder(...args),
  insert: (...args: unknown[]) => mockInsert(...args),
};
// Rows returned for the campaign_creators and deals queries, keyed by table name.
const relatedRows: Record<string, Record<string, unknown>[]> = {};
const relatedChain = (table: string) => ({
  select: () => ({ in: () => Promise.resolve({ data: relatedRows[table] ?? [], error: null }) }),
});
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => (table === "creators" ? creatorsChain : relatedChain(table)) }),
}));

const { GET, POST } = await import("./route");

function makeRequest(url: string, init?: RequestInit) { return new Request(url, init); }

describe("GET /api/manager/creators", () => {
  beforeEach(() => {
    mockRequireWorkspaceAccess.mockReset();
    mockOrder.mockReset();
    for (const key of Object.keys(relatedRows)) delete relatedRows[key];
  });

  it("returns campaign and deal counts for each creator", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockOrder.mockResolvedValue({ data: [{ id: "c1", workspaceId: "workspace-a" }, { id: "c2", workspaceId: "workspace-a" }], error: null });
    relatedRows.campaign_creators = [{ creatorId: "c1" }, { creatorId: "c1" }];
    relatedRows.deals = [{ creatorId: "c1" }];
    const response = await GET(makeRequest("http://localhost/api/manager/creators?workspaceId=workspace-a"));
    const body = await response.json();
    expect(body.creators[0]).toMatchObject({ id: "c1", campaignCount: 2, dealCount: 1 });
    expect(body.creators[1]).toMatchObject({ id: "c2", campaignCount: 0, dealCount: 0 });
  });

  it("counts active deals and their value, leaving declined deals out of both", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    mockOrder.mockResolvedValue({ data: [{ id: "c1", workspaceId: "workspace-a" }], error: null });
    relatedRows.campaign_creators = [];
    relatedRows.deals = [
      { creatorId: "c1", amount: 18000, acceptanceStatus: "confirmed" },
      { creatorId: "c1", amount: 9000, acceptanceStatus: "pending" },
      { creatorId: "c1", amount: 5000, acceptanceStatus: "declined" },
    ];
    const response = await GET(makeRequest("http://localhost/api/manager/creators?workspaceId=workspace-a"));
    const body = await response.json();
    expect(body.creators[0]).toMatchObject({ dealCount: 3, activeDealCount: 2, activeDealValue: 27000 });
  });

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

  it("never lets the client set link, relationship, or archive fields on create", async () => {
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "owner" });
    const chain = { select: () => chain, single: () => Promise.resolve({ data: { id: "new-id" }, error: null }) };
    mockInsert.mockReturnValue(chain);
    const smuggled = { ...validBody, linkedUserId: "someone", relationship: "managed", archivedAt: "2020-01-01", status: "linked" };
    await POST(makeRequest("http://localhost/api/manager/creators", { method: "POST", body: JSON.stringify(smuggled) }));
    const payload = mockInsert.mock.calls[0][0];
    expect(payload).not.toHaveProperty("linkedUserId");
    expect(payload).not.toHaveProperty("relationship");
    expect(payload).not.toHaveProperty("archivedAt");
    expect(payload).not.toHaveProperty("status");
  });
});
