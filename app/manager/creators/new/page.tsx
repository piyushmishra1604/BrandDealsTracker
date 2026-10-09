import { requireManagerWorkspace } from "@/lib/auth/workspace";
import { CreatorNewClient } from "../../../components/creator-new-client";

export default async function NewCreatorPage() {
  const { workspace } = await requireManagerWorkspace();
  return <CreatorNewClient workspaceId={workspace.id} />;
}
