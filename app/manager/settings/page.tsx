import { UsernameField } from "../../components/username-field";
import { WorkspaceFocusField } from "../../components/workspace-focus-field";
import { requireManagerWorkspace } from "@/lib/auth/workspace";

export default async function ManagerSettingsPage() {
  const { workspace } = await requireManagerWorkspace();
  return (
    <div className="max-w-2xl">
      <div className="mb-9 sm:mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Your account details.</p>
      </div>
      <div className="space-y-6">
        <WorkspaceFocusField workspaceId={workspace.id} initialFocus={workspace.focus} isOwner={workspace.role === "owner"} />
        <UsernameField />
      </div>
    </div>
  );
}
