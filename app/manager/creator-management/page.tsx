import { requireManagerWorkspace } from "@/lib/auth/workspace";
import { CreatorManagementClient } from "../../components/creator-management-client";

export default async function CreatorManagementPage() {
  const { workspace } = await requireManagerWorkspace();
  return <CreatorManagementClient workspaceId={workspace.id} />;
}
