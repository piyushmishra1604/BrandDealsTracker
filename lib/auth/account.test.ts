import { describe, it, expect, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }) }),
  }),
}));

const mockGetCurrentUser = vi.fn();
vi.mock("./session", () => ({ getCurrentUser: () => mockGetCurrentUser() }));

const { getAccountType, requireCreator, requireManagerAccount } = await import("./account");

describe("getAccountType", () => {
  beforeEach(() => mockMaybeSingle.mockReset());

  it("reads the account type from app_users", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { account_type: "manager" } });
    expect(await getAccountType("user-1")).toBe("manager");
  });

  it("returns null for an unrecognized value, failing closed", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { account_type: "admin" } });
    expect(await getAccountType("user-1")).toBeNull();
  });

  it("returns null when no matching user row exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    expect(await getAccountType("missing")).toBeNull();
  });
});

describe("requireCreator", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockGetCurrentUser.mockReset(); });

  it("rejects an unauthenticated request", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    expect(await requireCreator()).toBeNull();
  });

  it("returns the session for a creator account (existing creator flows keep working)", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-1", email: "a@example.com" });
    mockMaybeSingle.mockResolvedValue({ data: { account_type: "creator" } });
    expect(await requireCreator()).toEqual({ sub: "user-1", email: "a@example.com" });
  });

  it("rejects a manager account hitting a creator-only route (unauthorized write/read guard)", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-2", email: "m@example.com" });
    mockMaybeSingle.mockResolvedValue({ data: { account_type: "manager" } });
    expect(await requireCreator()).toBeNull();
  });
});

describe("requireManagerAccount", () => {
  beforeEach(() => { mockMaybeSingle.mockReset(); mockGetCurrentUser.mockReset(); });

  it("rejects a creator account hitting a manager-only route", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-1", email: "a@example.com" });
    mockMaybeSingle.mockResolvedValue({ data: { account_type: "creator" } });
    expect(await requireManagerAccount()).toBeNull();
  });

  it("returns the session for a manager account", async () => {
    mockGetCurrentUser.mockResolvedValue({ sub: "user-3", email: "m@example.com" });
    mockMaybeSingle.mockResolvedValue({ data: { account_type: "manager" } });
    expect(await requireManagerAccount()).toEqual({ sub: "user-3", email: "m@example.com" });
  });
});
