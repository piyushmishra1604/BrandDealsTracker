import { requireManagerWorkspace } from "@/lib/auth/workspace";
import { CreatorListClient } from "../../components/creator-list-client";

export default async function CreatorsPage() {
  const { workspace } = await requireManagerWorkspace();
  return <CreatorListClient workspaceId={workspace.id} />;
}
