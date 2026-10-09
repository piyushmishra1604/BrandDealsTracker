import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/auth/workspace", () => ({ requireWorkspaceAccess: (...args: unknown[]) => mockRequireWorkspaceAccess(...args) }));

const mockCreatorMaybeSingle = vi.fn();
const mockAccountMaybeSingle = vi.fn();
const mockAlreadyLinkedMaybeSingle = vi.fn();
const mockUpdate = vi.fn();

// app_users lookup and creators (already-linked) lookup both chain .select().eq().eq()...
// so a call counter distinguishes which table is being queried without over-mocking.
let fromCallCount = 0;
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      fromCallCount += 1;
      if (table === "creators" && fromCallCount === 1) {
        return { select: () => ({ eq: () => ({ maybeSingle: () => mockCreatorMaybeSingle() }) }) };
      }
      if (table === "app_users") {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => mockAccountMaybeSingle() }) }) }) };
      }
      // Second "creators" table access: the already-linked-elsewhere check.
      return {
        select: () => ({ eq: () => ({ eq: () => ({ neq: () => ({ maybeSingle: () => mockAlreadyLinkedMaybeSingle() }) }) }) }),
        update: (...args: unknown[]) => mockUpdate(...args),
      };
    },
  }),
}));

const { POST } = await import("./route");

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/manager/creators/c1/link", { method: "POST", body: JSON.stringify(body) });
}
const params = Promise.resolve({ id: "c1" });
const existingCreator = { id: "c1", workspaceId: "workspace-a", name: "Ankita Rath", status: "contact" };

describe("POST /api/manager/creators/[id]/link", () => {
  beforeEach(() => {
    fromCallCount = 0;
    mockCreatorMaybeSingle.mockReset();
    mockAccountMaybeSingle.mockReset();
    mockAlreadyLinkedMaybeSingle.mockReset();
    mockRequireWorkspaceAccess.mockReset();
    mockUpdate.mockReset();
  });

  it("rejects a request missing the account id", async () => {
    const response = await POST(makeRequest({}), { params });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a creator that doesn't exist", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: null });
    const response = await POST(makeRequest({ accountId: "user-9" }), { params });
    expect(response.status).toBe(404);
  });

  it("returns the same 404 for a creator in another agency's workspace", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue(null);
    const response = await POST(makeRequest({ accountId: "user-9" }), { params });
    expect(response.status).toBe(404);
  });

  it("rejects linking when the account isn't a real creator account", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockAccountMaybeSingle.mockResolvedValue({ data: null });
    const response = await POST(makeRequest({ accountId: "user-9" }), { params });
    expect(response.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("rejects linking an account already linked to another creator in the workspace", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockAccountMaybeSingle.mockResolvedValue({ data: { id: "user-9" } });
    mockAlreadyLinkedMaybeSingle.mockResolvedValue({ data: { id: "c2", name: "Other Creator" } });
    const response = await POST(makeRequest({ accountId: "user-9" }), { params });
    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.error).toMatch(/already linked/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("links the creator to the verified account", async () => {
    mockCreatorMaybeSingle.mockResolvedValue({ data: existingCreator });
    mockRequireWorkspaceAccess.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockAccountMaybeSingle.mockResolvedValue({ data: { id: "user-9" } });
    mockAlreadyLinkedMaybeSingle.mockResolvedValue({ data: null });
    const updateChain = { eq: () => updateChain, select: () => updateChain, single: () => Promise.resolve({ data: { ...existingCreator, linkedUserId: "user-9", status: "linked" }, error: null }) };
    mockUpdate.mockReturnValue(updateChain);
    const response = await POST(makeRequest({ accountId: "user-9" }), { params });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.creator.linkedUserId).toBe("user-9");
    expect(body.creator.status).toBe("linked");
  });
});
