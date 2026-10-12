import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeResult } from "@/lib/testing/fake-supabase";

const state = vi.hoisted(() => ({ fake: null as unknown, user: null as unknown }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => state.fake }));

const { POST } = await import("./route");

beforeEach(() => {
  state.user = { sub: "user-9", email: "c@example.com" };
});

describe("POST /api/notifications/read", () => {
  it("rejects a request with no signed-in account", async () => {
    state.user = null;
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("marks only the signed-in account's unread notifications as read", async () => {
    const fake = createFakeSupabase((): FakeResult => ({ data: null, error: null }));
    state.fake = fake;
    const response = await POST();
    expect(response.status).toBe(200);
    const update = fake.queries.find(q => q.op === "update");
    expect(update?.filters).toEqual({ userId: "user-9" });
    expect(update?.isNull).toEqual(["readAt"]);
    expect(update?.payload).toHaveProperty("readAt");
  });
});
