import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type CampaignCreatorEntry } from "@/lib/campaign-creators";

const CAMPAIGN_NOT_FOUND = { error: "Campaign not found." } as const;

async function getAuthorizedCampaign(campaignId: string) {
  const supabase = getSupabaseAdmin();
  const { data: campaign } = await supabase.from("campaigns").select("id, workspaceId").eq("id", campaignId).maybeSingle();
  if (!campaign) return null;
  const access = await requireWorkspaceAccess(campaign.workspaceId);
  if (!access) return null;
  return { campaign, access, supabase };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorized = await getAuthorizedCampaign(id);
  if (!authorized) return NextResponse.json(CAMPAIGN_NOT_FOUND, { status: 404 });

  const { data, error } = await authorized.supabase
    .from("campaign_creators")
    .select("*, creator:creators(id, name, instagramHandle, category, status)")
    .eq("campaignId", id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data as CampaignCreatorEntry[] });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorized = await getAuthorizedCampaign(id);
  if (!authorized) return NextResponse.json(CAMPAIGN_NOT_FOUND, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { creatorId } = (body ?? {}) as { creatorId?: unknown };
  if (typeof creatorId !== "string" || !creatorId) return NextResponse.json({ error: "Missing creator." }, { status: 400 });

  // The creator must belong to the same workspace as the campaign — never trust a
  // creatorId from the client without re-checking it against the authorized workspace.
  const { data: creator } = await authorized.supabase.from("creators").select("id").eq("id", creatorId).eq("workspaceId", authorized.campaign.workspaceId).maybeSingle();
  if (!creator) return NextResponse.json({ error: "Creator not found in this workspace." }, { status: 404 });

  const { data, error } = await authorized.supabase
    .from("campaign_creators")
    .insert({ campaignId: id, creatorId, workspaceId: authorized.campaign.workspaceId, addedBy: authorized.access.sub })
    .select("*, creator:creators(id, name, instagramHandle, category, status)")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "This creator is already on the campaign." }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ entry: data as CampaignCreatorEntry });
}
