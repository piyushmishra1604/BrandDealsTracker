import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFakeSupabase, type FakeQuery, type FakeResult } from "@/lib/testing/fake-supabase";

const state = vi.hoisted(() => ({ fake: null as unknown, user: null as unknown }));
vi.mock("@/lib/auth/account", () => ({ requireCreator: async () => state.user }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdmin: () => state.fake }));

const { DELETE } = await import("./route");

function useFake(existing: Record<string, unknown> | null, deleted: unknown[] = [{ id: "deal-1" }]) {
  const fake = createFakeSupabase((q: FakeQuery): FakeResult => {
    if (q.op === "select") return { data: existing };
    if (q.op === "delete") return { data: deleted, error: null };
    return { data: null };
  });
  state.fake = fake;
  return fake;
}

const params = Promise.resolve({ id: "deal-1" });
const request = () => new Request("http://localhost/api/deals/deal-1", { method: "DELETE" });

beforeEach(() => {
  state.user = { sub: "creator-1", email: "c@example.com" };
});

describe("DELETE /api/deals/[id]", () => {
  it("deletes an own self-created deal", async () => {
    const fake = useFake({ campaignId: null });
    const response = await DELETE(request(), { params });
    expect(response.status).toBe(200);
    expect(fake.queries.find(q => q.op === "delete")?.filters).toMatchObject({ id: "deal-1", user_id: "creator-1" });
  });

  it("blocks deleting a manager-assigned deal", async () => {
    const fake = useFake({ campaignId: "camp-1" });
    const response = await DELETE(request(), { params });
    expect(response.status).toBe(403);
    expect(fake.queries.some(q => q.op === "delete")).toBe(false);
  });

  it("reports when the deletion matched nothing", async () => {
    useFake({ campaignId: null }, []);
    const response = await DELETE(request(), { params });
    expect(response.status).toBe(400);
  });
});
