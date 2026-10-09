import type { ReactNode } from "react";
import { requireManagerWorkspace } from "@/lib/auth/workspace";
import { displayNameFromEmail } from "@/lib/auth/account";
import { ManagerSidebar } from "../components/manager-sidebar";
import { TopBar } from "../components/top-bar";

// Server-side guard (WP1.6): this runs on every hard navigation/reload into /manager.
// account_type never changes mid-session, so checking it once here is safe — unlike
// per-resource checks (e.g. "does this user belong to this workspace"), which vary by
// page and must be re-verified in each page/route per Next.js's data-access-layer guidance.
export default async function ManagerLayout({ children }: { children: ReactNode }) {
  const { user, workspace } = await requireManagerWorkspace();
  const userName = displayNameFromEmail(user.email);
  const roleLabel = workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1);

  return (
    <div className="min-h-screen bg-[#f0f4f9] p-2 text-[#101c40] sm:p-4">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_#20345c08] md:flex-row">
        <ManagerSidebar workspaceName={workspace.name} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar userName={userName} userRole={roleLabel} searchPlaceholder="Search campaigns, creators, brands…" />
          <main id="manager-dashboard" className="min-w-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
