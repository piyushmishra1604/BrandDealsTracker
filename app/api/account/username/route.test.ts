import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetCurrentUser = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: () => mockGetCurrentUser() }));

const mockGetAccountTypes = vi.fn();
vi.mock("@/lib/auth/account", () => ({ getAccountTypes: (...args: unknown[]) => mockGetAccountTypes(...args) }));

const mockMaybeSingle = vi.fn();
const mockUpdateEq = vi.fn();
const supabaseChain = {
  select: () => supabaseChain,
  eq: () => supabaseChain,
  maybeSingle: () => mockMaybeSingle(),
  update: () => ({ eq: (...args: unknown[]) => mockUpdateEq(...args) }),
};
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => ({ from: () => supabaseChain }) }));

const { GET, PATCH } = await import("./route");

const signedIn = { sub: "user-1", email: "user@example.com" };

function availabilityRequest(username: string) {
  return new Request(`http://localhost/api/account/username?username=${encodeURIComponent(username)}`);
}

function saveRequest(body: unknown) {
  return new Request("http://localhost/api/account/username", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/account/username", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockGetAccountTypes.mockReset();
    mockMaybeSingle.mockReset();
    mockGetCurrentUser.mockResolvedValue(signedIn);
    mockGetAccountTypes.mockResolvedValue(["creator"]);
  });

  it("rejects a signed-out request", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const response = await GET(availabilityRequest("rahul"));
    expect(response.status).toBe(401);
  });

  it("reports an invalid format without querying the database", async () => {
    const response = await GET(availabilityRequest("has space"));
    const body = await response.json();
    expect(body.available).toBe(false);
    expect(body.message).toMatch(/only lowercase/);
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it("reports taken when another account holds the name", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "user-2" } });
    const body = await (await GET(availabilityRequest("Rahul"))).json();
    expect(body).toEqual({ available: false, message: "Username is taken." });
  });

  it("reports available when no account holds the name", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null });
    const body = await (await GET(availabilityRequest("rahul_mehta"))).json();
    expect(body).toEqual({ available: true, message: "Username is available." });
  });

  it("treats the signed-in account's own name as available", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "user-1" } });
    const body = await (await GET(availabilityRequest("rahul"))).json();
    expect(body.available).toBe(true);
    expect(body.message).toMatch(/current username/);
  });
});

describe("PATCH /api/account/username", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockGetAccountTypes.mockReset();
    mockUpdateEq.mockReset();
    mockGetCurrentUser.mockResolvedValue(signedIn);
    mockGetAccountTypes.mockResolvedValue(["manager"]);
  });

  it("rejects a signed-out request", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const response = await PATCH(saveRequest({ username: "rahul" }));
    expect(response.status).toBe(401);
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it("rejects an invalid username without writing", async () => {
    const response = await PATCH(saveRequest({ username: "ab" }));
    expect(response.status).toBe(400);
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it("saves the normalized username for the signed-in account", async () => {
    mockUpdateEq.mockResolvedValue({ error: null });
    const response = await PATCH(saveRequest({ username: "  Rahul_Mehta " }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ username: "rahul_mehta" });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-1");
  });

  it("returns 409 when the unique index rejects a name taken in a race", async () => {
    mockUpdateEq.mockResolvedValue({ error: { code: "23505", message: "duplicate key" } });
    const response = await PATCH(saveRequest({ username: "rahul" }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("Username is taken.");
  });
});
