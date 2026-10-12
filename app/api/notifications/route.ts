import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type AppNotification } from "@/lib/notifications";

const RECENT_LIMIT = 20;

// Notifications belong to the signed-in account only. The user is taken from the session,
// never from the request, so one account can't read another's notifications.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to see notifications." }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const [{ data, error }, { data: unread, error: unreadError }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, kind, dealId, readAt, created_at, deal:deals(brand)")
      .eq("userId", user.sub)
      .order("created_at", { ascending: false }),
    supabase.from("notifications").select("id").eq("userId", user.sub).is("readAt", null),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (unreadError) return NextResponse.json({ error: unreadError.message }, { status: 500 });

  type Row = { id: string; kind: "deal_assigned"; dealId: string | null; readAt: string | null; created_at: string; deal: { brand: string } | null };
  const notifications: AppNotification[] = ((data ?? []) as unknown as Row[]).slice(0, RECENT_LIMIT).map(row => ({
    id: row.id,
    kind: row.kind,
    dealId: row.dealId,
    brand: row.deal?.brand ?? null,
    readAt: row.readAt,
    createdAt: row.created_at,
  }));
  return NextResponse.json({ notifications, unreadCount: (unread ?? []).length });
}
