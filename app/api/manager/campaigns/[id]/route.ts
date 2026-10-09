import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isCampaignInput, campaignDateError, isValidImageUrl, isValidCampaignNotes, type Campaign } from "@/lib/campaigns";

// Same message whether the campaign doesn't exist or this manager can't access its
// workspace, so a guessed id never reveals whether a campaign exists elsewhere.
const NOT_FOUND = { error: "Campaign not found." } as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign) return NextResponse.json(NOT_FOUND, { status: 404 });

  const access = await requireWorkspaceAccess(campaign.workspaceId);
  if (!access) return NextResponse.json(NOT_FOUND, { status: 404 });

  const { count } = await supabase.from("campaign_creators").select("id", { count: "exact", head: true }).eq("campaignId", id);
  return NextResponse.json({ campaign: { ...campaign, creatorCount: count ?? 0 } as Campaign });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let updates: unknown;
  try { updates = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!updates || typeof updates !== "object") return NextResponse.json({ error: "Invalid campaign data." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!existing) return NextResponse.json(NOT_FOUND, { status: 404 });

  // Manager-level access is enough to edit; owner-only actions (if any) would raise minRole here.
  const access = await requireWorkspaceAccess(existing.workspaceId);
  if (!access) return NextResponse.json(NOT_FOUND, { status: 404 });

  const merged = { ...existing, ...(updates as Record<string, unknown>) };
  const mergedImageUrl = (merged as { imageUrl?: unknown }).imageUrl;
  const mergedNotes = (merged as { notes?: unknown }).notes;
  if (!isCampaignInput(merged)) return NextResponse.json({ error: "Invalid campaign data." }, { status: 400 });
  const dateError = campaignDateError(merged);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });
  if (mergedImageUrl != null && !isValidImageUrl(mergedImageUrl)) return NextResponse.json({ error: "Invalid image." }, { status: 400 });
  if (mergedNotes != null && !isValidCampaignNotes(mergedNotes)) return NextResponse.json({ error: "Notes are too long." }, { status: 400 });

  const { data, error } = await supabase
    .from("campaigns")
    .update({
      brand: merged.brand, title: merged.title, budget: merged.budget, currency: merged.currency,
      startDate: merged.startDate, endDate: merged.endDate, status: merged.status, imageUrl: mergedImageUrl ?? null,
      category: merged.category ?? null, description: merged.description ?? null, notes: mergedNotes ?? null,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data as Campaign });
}
