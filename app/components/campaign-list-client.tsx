"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CloudCampaigns } from "./cloud-campaigns";
import { CampaignTable } from "./campaign-table";
import { campaignStatuses, campaignStatusLabels, type Campaign, type CampaignStatus } from "@/lib/campaigns";

type TabFilter = "all" | CampaignStatus;

export function CampaignListClient({ workspaceId }: { workspaceId: string }) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");

  return (
    <div>
      <div className="mb-9 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Campaigns</h1>
          <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Manage all your brand campaigns in one place.</p>
        </div>
        <Link href="/manager/campaigns/new" className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          <Plus className="h-4 w-4" strokeWidth={2.4} /> Create Campaign
        </Link>
      </div>

      <CloudCampaigns workspaceId={workspaceId}>
        {(campaigns, _save, archive) => {
          const searchLower = search.trim().toLowerCase();
          const searched = campaigns.filter((campaign: Campaign) =>
            !searchLower || campaign.brand.toLowerCase().includes(searchLower) || campaign.title.toLowerCase().includes(searchLower));
          const filtered = tab === "all" ? searched : searched.filter(campaign => campaign.status === tab);
          const countFor = (status: TabFilter) => (status === "all" ? searched : searched.filter(c => c.status === status)).length;

          async function handleArchive(campaign: Campaign) {
            if (!window.confirm(`Archive the "${campaign.title}" campaign? It will no longer appear in your active campaign list.`)) return;
            const error = await archive(campaign.id);
            if (error) window.alert(error);
          }

          return (
            <>
              <nav aria-label="Filter by status" className="mb-7 flex gap-1 overflow-x-auto border-b border-[#edf1f8]">
                {(["all", ...campaignStatuses] as TabFilter[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setTab(status)}
                    aria-current={tab === status ? "page" : undefined}
                    className={`shrink-0 cursor-pointer border-b-2 px-4 py-3 text-sm font-medium transition-colors hover:text-[#101c40] ${tab === status ? "border-brand-600 text-brand-600" : "border-transparent text-[#53668e]"}`}
                  >
                    {status === "all" ? "All" : campaignStatusLabels[status]} ({countFor(status)})
                  </button>
                ))}
              </nav>

              <section aria-label="Search campaigns" className="mb-7">
                <label className="block w-full sm:w-64">
                  <span className="sr-only">Search campaigns</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search brand or campaign…"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500"
                  />
                </label>
              </section>

              <section aria-labelledby="campaigns-heading" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
                <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
                  <h2 id="campaigns-heading" className="text-lg font-bold">All Campaigns</h2>
                </div>
                <CampaignTable campaigns={filtered} emptyMessage={campaigns.length === 0 ? "No campaigns yet. Create your first campaign." : "No campaigns match this filter."} onArchive={(campaign) => void handleArchive(campaign)} />
              </section>
            </>
          );
        }}
      </CloudCampaigns>
    </div>
  );
}
