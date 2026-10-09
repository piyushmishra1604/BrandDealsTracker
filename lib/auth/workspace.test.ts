import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
const queryChain = {
  select: () => queryChain,
  eq: () => queryChain,
  order: () => queryChain,
  limit: () => queryChain,
  maybeSingle: () => mockMaybeSingle(),
};
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ from: () => queryChain }) }));

const mockGetCurrentUser = vi.fn();
vi.mock("./session", () => ({ getCurrentUser: () => mockGetCurrentUser() }));

const { getWorkspaceRole, requireWorkspaceAccess, getPrimaryWorkspace } = await import("./workspace");

describe("getWorkspaceRole", () => {
  beforeEach(() => mockMaybeSingle.mockReset());

  it("returns the member's role for that specific workspace", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { role: "owner" } });
    expect(await getWorkspaceRole("user-1", "workspace-a")).toBe("owner");
  });

  it("returns null when there is no membership row (not a member of that workspace)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    expect(await getWorkspaceRole("user-1", "workspace-b")).toBeNull();
  });
});

describe("requireWorkspaceAccess", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockGetCurrentUser.mockReset(); });

  it("rejects a creator account outright, before even checking membership", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-1", email: "a@example.com" });
    mockMaybeSingle.mockResolvedValueOnce({ data: { account_type: "creator" } });
    expect(await requireWorkspaceAccess("workspace-a")).toBeNull();
  });

  it("rejects a manager who belongs to a different agency (cross-agency isolation)", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-2", email: "m@example.com" });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { account_type: "manager" } }) // account type check
      .mockResolvedValueOnce({ data: null }); // no membership row for this workspace
    expect(await requireWorkspaceAccess("someone-elses-workspace")).toBeNull();
  });

  it("rejects a forged/empty workspace_id", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-2", email: "m@example.com" });
    expect(await requireWorkspaceAccess("")).toBeNull();
  });

  it("rejects a member role when an owner-level action is required", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-2", email: "m@example.com" });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { account_type: "manager" } })
      .mockResolvedValueOnce({ data: { role: "member" } });
    expect(await requireWorkspaceAccess("workspace-a", "owner")).toBeNull();
  });

  it("grants access to a verified member of their own workspace", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-2", email: "m@example.com" });
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { account_type: "manager" } })
      .mockResolvedValueOnce({ data: { role: "owner" } });
    expect(await requireWorkspaceAccess("workspace-a")).toEqual({ sub: "user-2", email: "m@example.com", role: "owner" });
  });
});

describe("getPrimaryWorkspace", () => {
  beforeEach(() => mockMaybeSingle.mockReset());

  it("returns null when the manager has no workspace", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    expect(await getPrimaryWorkspace("user-2")).toBeNull();
  });
});
