import { requireManagerWorkspace } from "@/lib/auth/workspace";
import { CampaignNewClient } from "../../../components/campaign-new-client";

export default async function NewCampaignPage() {
  const { workspace } = await requireManagerWorkspace();
  return <CampaignNewClient workspaceId={workspace.id} />;
}
