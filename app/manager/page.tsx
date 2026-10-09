import { requireManagerWorkspace } from "@/lib/auth/workspace";
import { ManagerDashboardClient } from "../components/manager-dashboard-client";

export default async function ManagerDashboardPage() {
  const { workspace } = await requireManagerWorkspace();
  return <ManagerDashboardClient workspaceId={workspace.id} workspaceName={workspace.name} />;
}
