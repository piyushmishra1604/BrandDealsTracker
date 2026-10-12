import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const supabaseChain = {
  select: () => supabaseChain,
  eq: () => supabaseChain,
  maybeSingle: () => mockMaybeSingle(),
  update: (...args: unknown[]) => mockUpdate(...args),
};
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({ from: (table: string) => { mockFrom(table); return supabaseChain; } }),
}));

const { POST } = await import("./route");

function makeRequest(body?: unknown) {
  return new Request("http://localhost/api/manager/creators/c1/archive", { method: "POST", body: JSON.stringify(body ?? {}) });
}
const params = Promise.resolve({ id: "c1" });
const existingCreator = { id: "c1", workspaceId: "workspace-a", name: "Ankita Rath", status: "contact", relationship: "external" };
const manager = { sub: "user-1", email: "a@example.com", role: "owner" };

describe("POST /api/manager/creators/[id]/archive", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockRequireWorkspaceAccess.mockReset(); mockUpdate.mockReset(); mockFrom.mockClear(); });

  it("only touches the creators table, so deal history is left intact", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    const chain = { eq: () => chain, select: () => chain, single: () => Promise.resolve({ data: { ...existingCreator, archivedAt: "now" }, error: null }) };
    mockUpdate.mockReturnValue(chain);
    await POST(makeRequest({ archived: true }), { params });
    const tables = new Set(mockFrom.mock.calls.map(([table]) => table));
    expect([...tables]).toEqual(["creators"]);
    expect(mockUpdate.mock.calls.every(([payload]) => Object.keys(payload).join() === "archivedAt")).toBe(true);
  });

  it("returns 404 for a creator in another agency's workspace, and changes nothing", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await POST(makeRequest({ archived: true }), { params });
    expect(response.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects a body that doesn't say archive or restore", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    const response = await POST(makeRequest({ archived: "yes" }), { params });
    expect(response.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("sets archivedAt when archiving", async () => {
    mockMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    const chain = { eq: () => chain, select: () => chain, single: () => Promise.resolve({ data: { ...existingCreator, archivedAt: "now" }, error: null }) };
    mockUpdate.mockReturnValue(chain);
    const response = await POST(makeRequest({ archived: true }), { params });
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ archivedAt: expect.any(String) });
  });

  it("clears archivedAt when restoring", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { ...existingCreator, archivedAt: "earlier" } });
    mockRequireWorkspaceAccess.mockResolvedValue(manager);
    const chain = { eq: () => chain, select: () => chain, single: () => Promise.resolve({ data: existingCreator, error: null }) };
    mockUpdate.mockReturnValue(chain);
    const response = await POST(makeRequest({ archived: false }), { params });
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ archivedAt: null });
  });
});
