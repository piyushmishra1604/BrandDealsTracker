import { notFound } from "next/navigation";
import { requireManagerWorkspace, requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { type Creator } from "@/lib/creators";
import { CreatorDetailClient } from "../../../components/creator-detail-client";

export default async function CreatorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireManagerWorkspace();
  const { id } = await params;

  const supabase = getSupabaseAdmin();
  const { data: creator } = await supabase.from("creators").select("*").eq("id", id).maybeSingle();
  if (!creator) notFound();

  const access = await requireWorkspaceAccess(creator.workspaceId);
  if (!access) notFound();

  let linkedEmail: string | null = null;
  if (creator.linkedUserId) {
    const { data: account } = await supabase.from("app_users").select("email").eq("id", creator.linkedUserId).maybeSingle();
    linkedEmail = account?.email ?? null;
  }

  return <CreatorDetailClient creator={creator as Creator} linkedEmail={linkedEmail} />;
}
