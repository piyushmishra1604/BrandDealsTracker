import { requireManagerWorkspace } from "@/lib/auth/workspace";
import { CampaignListClient } from "../../components/campaign-list-client";

export default async function CampaignsPage() {
  const { workspace } = await requireManagerWorkspace();
  return <CampaignListClient workspaceId={workspace.id} />;
}
