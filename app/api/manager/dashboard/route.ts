import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  const access = await requireWorkspaceAccess(workspaceId);
  if (!access) return NextResponse.json({ error: "Not signed in, or you don't have access to this workspace." }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const [{ count: totalCampaigns, error: totalError }, { count: activeCampaigns, error: activeError }] = await Promise.all([
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("workspaceId", workspaceId).neq("status", "archived"),
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("workspaceId", workspaceId).eq("status", "active"),
  ]);
  if (totalError) return NextResponse.json({ error: totalError.message }, { status: 500 });
  if (activeError) return NextResponse.json({ error: activeError.message }, { status: 500 });

  return NextResponse.json({
    metrics: {
      totalCampaigns: totalCampaigns ?? 0,
      activeCampaigns: activeCampaigns ?? 0,
      // Creator directory (M4) and deal assignment (M5) don't exist yet, so these stay
      // at 0 until those migrations land — not a bug, a documented placeholder.
      totalCreators: 0,
      totalDeals: 0,
    },
  });
}
