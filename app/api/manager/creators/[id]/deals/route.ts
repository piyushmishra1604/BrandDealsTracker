import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { summarizeCreatorDeals, type CreatorDealRow, type CreatorDealSummary } from "@/lib/creator-deal-history";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: creator } = await supabase.from("creators").select("id, workspaceId").eq("id", id).maybeSingle();
  if (!creator) return NextResponse.json({ error: "Creator not found." }, { status: 404 });
  const access = await requireWorkspaceAccess(creator.workspaceId);
  if (!access) return NextResponse.json({ error: "Creator not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("deals")
    .select("id, brand, amount, dealDate, dueDate, acceptanceStatus, moneyReceived, campaignId, campaign:campaigns(id, title, brand, status)")
    .eq("creatorId", id)
    .order("dueDate", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const deals = (data ?? []) as unknown as CreatorDealRow[];
  const summary: CreatorDealSummary = summarizeCreatorDeals(deals);
  return NextResponse.json({ deals, summary });
}
