import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type CampaignCreatorEntry } from "@/lib/campaign-creators";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: creator } = await supabase.from("creators").select("id, workspaceId").eq("id", id).maybeSingle();
  if (!creator) return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  const access = await requireWorkspaceAccess(creator.workspaceId);
  if (!access) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("campaign_creators")
    .select("*, campaign:campaigns(id, title, brand, status)")
    .eq("creatorId", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data as CampaignCreatorEntry[] });
}
