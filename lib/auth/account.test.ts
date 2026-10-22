import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }),
  }),
}));

const mockGetCurrentUser = vi.fn();
vi.mock("./session", () => ({ getCurrentUser: () => mockGetCurrentUser() }));

const { getAccountTypes, hasAccountType, requireCreator, requireManagerAccount } = await import("./account");

describe("getAccountTypes", () => {
  beforeEach(() => mockMaybeSingle.mockReset());

  it("reads every role the account has from app_users", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { account_types: ["creator", "manager"] } });
    expect(await getAccountTypes("user-1")).toEqual(["creator", "manager"]);
  });

  it("returns an empty list for an unrecognized value, failing closed", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { account_types: ["admin"] } });
    expect(await getAccountTypes("user-1")).toEqual([]);
  });

  it("returns an empty list when no matching user row exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    expect(await getAccountTypes("missing")).toEqual([]);
  });
});

describe("hasAccountType", () => {
  beforeEach(() => mockMaybeSingle.mockReset());

  it("is true when the account holds that role", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { account_types: ["creator", "manager"] } });
    expect(await hasAccountType("user-1", "manager")).toBe(true);
  });

  it("is false when the account doesn't hold that role", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { account_types: ["creator"] } });
    expect(await hasAccountType("user-1", "manager")).toBe(false);
  });
});

describe("requireCreator", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockGetCurrentUser.mockReset(); });

  it("rejects an unauthenticated request", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    expect(await requireCreator()).toBeNull();
  });

  it("returns the session for a creator-role session (existing creator flows keep working)", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "creator" });
    mockMaybeSingle.mockResolvedValue({ data: { account_types: ["creator"] } });
    expect(await requireCreator()).toEqual({ sub: "user-1", email: "a@example.com", role: "creator" });
  });

  it("rejects a session currently acting as manager, even on a dual-role account", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-2", email: "m@example.com", role: "manager" });
    mockMaybeSingle.mockResolvedValue({ data: { account_types: ["creator", "manager"] } });
    expect(await requireCreator()).toBeNull();
  });

  it("rejects a creator-role session whose account no longer has that role", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-2", email: "m@example.com", role: "creator" });
    mockMaybeSingle.mockResolvedValue({ data: { account_types: ["manager"] } });
    expect(await requireCreator()).toBeNull();
  });
});

describe("requireManagerAccount", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockGetCurrentUser.mockReset(); });

  it("rejects a creator-role session hitting a manager-only route", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-1", email: "a@example.com", role: "creator" });
    mockMaybeSingle.mockResolvedValue({ data: { account_types: ["creator"] } });
    expect(await requireManagerAccount()).toBeNull();
  });

  it("returns the session for a manager-role session", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-3", email: "m@example.com", role: "manager" });
    mockMaybeSingle.mockResolvedValue({ data: { account_types: ["manager"] } });
    expect(await requireManagerAccount()).toEqual({ sub: "user-3", email: "m@example.com", role: "manager" });
  });
});
