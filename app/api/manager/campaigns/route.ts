import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isCampaignInput, campaignDateError, isValidImageUrl, type Campaign, type CampaignInput } from "@/lib/campaigns";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  const access = await requireWorkspaceAccess(workspaceId);
  if (!access) return NextResponse.json({ error: "Not signed in, or you don't have access to this workspace." }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("campaigns")
    .select("*")
    .eq("workspaceId", workspaceId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data as Campaign[] });
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
