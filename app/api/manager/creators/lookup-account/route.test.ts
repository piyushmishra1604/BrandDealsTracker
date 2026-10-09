import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireManagerAccount = vi.fn();
vi.mock("@/lib/auth/account", () => ({ requireManagerAccount: (...args: unknown[]) => mockRequireManagerAccount(...args) }));

const mockMaybeSingle = vi.fn();
const supabaseChain = {
  select: () => supabaseChain,
  eq: () => supabaseChain,
  maybeSingle: () => mockMaybeSingle(),
};
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ from: () => supabaseChain }) }));

const { GET } = await import("./route");

function makeRequest(email: string) {
  return new Request(`http://localhost/api/manager/creators/lookup-account?email=${encodeURIComponent(email)}`);
}

describe("GET /api/manager/creators/lookup-account", () => {
  beforeEach(() => { mockRequireManagerAccount.mockReset(); mockMaybeSingle.mockReset(); });

  it("rejects an unauthenticated request", async () => {
    mockRequireManagerAccount.mockResolvedValue(null);
    const response = await GET(makeRequest("creator@example.com"));
    expect(response.status).toBe(401);
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it("rejects a malformed email without querying the database", async () => {
    mockRequireManagerAccount.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    const response = await GET(makeRequest("not-an-email"));
    expect(response.status).toBe(400);
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns 404 when no creator account matches the email", async () => {
    mockRequireManagerAccount.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockMaybeSingle.mockResolvedValue({ data: null });
    const response = await GET(makeRequest("nobody@example.com"));
    const body = await response.json();
    expect(response.status).toBe(404);
    expect(body.error).toMatch(/no creator account/i);
  });

  it("returns the account for an exact-match creator email", async () => {
    mockRequireManagerAccount.mockResolvedValue({ sub: "manager-1", email: "m@example.com" });
    mockMaybeSingle.mockResolvedValue({ data: { id: "user-9", email: "creator@example.com" } });
    const response = await GET(makeRequest("Creator@Example.com"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.account).toEqual({ id: "user-9", email: "creator@example.com" });
  });
});
