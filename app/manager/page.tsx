import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccountType } from "@/lib/auth/account";
import { getPrimaryWorkspace } from "@/lib/auth/workspace";

export default async function ManagerDashboardPage() {
  // Belt-and-suspenders with the layout guard: the Next.js docs recommend re-checking
  // authorization in the page itself, since layouts don't re-run on client navigation.
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const accountType = await getAccountType(user.sub);
  if (accountType !== "manager") redirect("/");

  const workspace = await getPrimaryWorkspace(user.sub);

  return (
    <div>
      <div className="mb-9 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{workspace?.name ?? "Agency dashboard"}</h1>
          <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Campaigns, creators, and deals will show up here as you build them.</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d7e0f0] bg-[#f7f9fd] px-6 py-16 text-center">
        <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
          <Megaphone className="h-6 w-6" strokeWidth={2} />
        </span>
        <p className="text-base font-semibold text-[#101c40]">No campaigns yet</p>
        <p className="max-w-sm text-sm text-[#53668e]">Campaign creation is coming in the next milestone. Once it&rsquo;s live, your campaigns will be listed here.</p>
      </div>
    </div>
  );
}
