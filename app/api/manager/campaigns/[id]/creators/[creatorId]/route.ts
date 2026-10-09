import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; creatorId: string }> }) {
  const { id, creatorId } = await params;
  const supabase = getSupabaseAdmin();

  const { data: campaign } = await supabase.from("campaigns").select("id, workspaceId").eq("id", id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const access = await requireWorkspaceAccess(campaign.workspaceId);
  if (!access) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const { data, error } = await supabase.from("campaign_creators").delete().eq("campaignId", id).eq("creatorId", creatorId).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length !== 1) return NextResponse.json({ error: "That creator isn't on this campaign." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
