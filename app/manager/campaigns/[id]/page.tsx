import { notFound } from "next/navigation";
import { requireManagerWorkspace, requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type Campaign } from "@/lib/campaigns";
import { CampaignDetailClient } from "../../../components/campaign-detail-client";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Confirms this is a manager account at all (redirects home otherwise); the
  // specific-campaign check below is what actually authorizes this page's data.
  await requireManagerWorkspace();
  const { id } = await params;

  const { data: campaign } = await getSupabaseAdmin().from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign) notFound();

  const access = await requireWorkspaceAccess(campaign.workspaceId);
  if (!access) notFound();

  return <CampaignDetailClient campaign={campaign as Campaign} />;
}
