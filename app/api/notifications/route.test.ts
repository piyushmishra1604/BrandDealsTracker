import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeQuery, type FakeResult } from "@/lib/testing/fake-supabase";

const state = vi.hoisted(() => ({ fake: null as unknown, user: null as unknown }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => state.fake }));

const { GET } = await import("./route");

function useFake(rows: unknown[], unreadRows: unknown[]) {
  state.fake = createFakeSupabase((q: FakeQuery): FakeResult => {
    if (q.table !== "notifications") return { data: null };
    return { data: q.isNull.includes("readAt") ? unreadRows : rows };
  });
  return state.fake as ReturnType<typeof createFakeSupabase>;
}

beforeEach(() => {
  state.user = { sub: "user-9", email: "c@example.com" };
});

describe("GET /api/notifications", () => {
  it("rejects a request with no signed-in account", async () => {
    state.user = null;
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns the account's notifications with the deal brand and the unread count", async () => {
    const fake = useFake(
      [{ id: "n1", kind: "deal_assigned", dealId: "deal-1", readAt: null, created_at: "2026-10-02T00:00:00Z", deal: { brand: "Nike" } }],
      [{ id: "n1" }],
    );
    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.notifications).toEqual([{ id: "n1", kind: "deal_assigned", dealId: "deal-1", brand: "Nike", readAt: null, createdAt: "2026-10-02T00:00:00Z" }]);
    expect(body.unreadCount).toBe(1);
    expect(fake.queries.every(q => q.filters.userId === "user-9")).toBe(true);
  });

  it("only returns the 20 most recent notifications", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: `n${i}`, kind: "deal_assigned", dealId: null, readAt: null, created_at: "2026-10-02T00:00:00Z", deal: null }));
    useFake(rows, []);
    const body = await (await GET()).json();
    expect(body.notifications).toHaveLength(20);
  });
});
