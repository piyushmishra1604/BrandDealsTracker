import { notFound } from "next/navigation";
import { requireManagerWorkspace, requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type Creator } from "@/lib/creators";
import { CreatorDetailClient } from "../../../components/creator-detail-client";

export default async function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManagerWorkspace();
  const { id } = await params;

  const { data: creator } = await getSupabaseAdmin().from("creators").select("*").eq("id", id).maybeSingle();
  if (!creator) notFound();

  const access = await requireWorkspaceAccess(creator.workspaceId);
  if (!access) notFound();

  return <CreatorDetailClient creator={creator as Creator} />;
}
