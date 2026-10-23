import { requireManagerWorkspace } from "@/lib/auth/workspace";
import { CreatorListClient } from "../../components/creator-list-client";

export default async function CreatorsPage() {
  const { workspace } = await requireManagerWorkspace(["campaigns"]);
  return <CreatorListClient workspaceId={workspace.id} />;
}
