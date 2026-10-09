import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isCampaignInput, campaignDateError, isValidImageUrl, type Campaign, type CampaignInput } from "@/lib/campaigns";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  const access = await requireWorkspaceAccess(workspaceId);
  if (!access) return NextResponse.json({ error: "Not signed in, or you don't have access to this workspace." }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const [{ data, error }, { data: memberships, error: membershipsError }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("workspaceId", workspaceId).order("created_at", { ascending: false }),
    supabase.from("campaign_creators").select("campaignId").eq("workspaceId", workspaceId),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (membershipsError) return NextResponse.json({ error: membershipsError.message }, { status: 500 });

  // The campaigns table has no creatorCount column — tally memberships per campaign
  // here instead of storing a count that could drift out of sync with campaign_creators.
  const counts = new Map<string, number>();
  for (const { campaignId } of memberships ?? []) counts.set(campaignId, (counts.get(campaignId) ?? 0) + 1);
  const campaigns = (data as Campaign[]).map(campaign => ({ ...campaign, creatorCount: counts.get(campaign.id) ?? 0 }));
  return NextResponse.json({ campaigns });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { workspaceId, imageUrl, ...campaignFields } = (body ?? {}) as { workspaceId?: unknown; imageUrl?: unknown } & Partial<CampaignInput>;

  if (typeof workspaceId !== "string" || !workspaceId) return NextResponse.json({ error: "Missing workspace." }, { status: 400 });
  // Only a manager (owner/manager/member) of this exact workspace may create a campaign in it.
  const access = await requireWorkspaceAccess(workspaceId);
  if (!access) return NextResponse.json({ error: "Not signed in, or you don't have access to this workspace." }, { status: 401 });

  if (!isCampaignInput(campaignFields)) return NextResponse.json({ error: "Invalid campaign data." }, { status: 400 });
  const dateError = campaignDateError(campaignFields);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
  if (imageUrl != null && !isValidImageUrl(imageUrl)) return NextResponse.json({ error: "Invalid image." }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("campaigns")
    .insert({ ...campaignFields, workspaceId, createdBy: access.sub, imageUrl: imageUrl ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data as Campaign });
}
