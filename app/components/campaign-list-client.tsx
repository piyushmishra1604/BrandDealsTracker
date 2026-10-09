"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CloudCampaigns } from "./cloud-campaigns";
import { CampaignTable } from "./campaign-table";

export function CampaignListClient({ workspaceId }: { workspaceId: string }) {
  const [search, setSearch] = useState("");

  return (
    <div>
      <div className="mb-9 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Campaigns</h1>
          <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Every active collaboration your agency is running.</p>
        </div>
        <Link href="/manager/campaigns/new" className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          <Plus className="h-4 w-4" strokeWidth={2.4} /> Create Campaign
        </Link>
      </div>

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
        <CloudCampaigns workspaceId={workspaceId}>
          {(campaigns) => {
            const searchLower = search.trim().toLowerCase();
            const filtered = campaigns.filter(campaign =>
              !searchLower || campaign.brand.toLowerCase().includes(searchLower) || campaign.title.toLowerCase().includes(searchLower));
            return <CampaignTable campaigns={filtered} emptyMessage={campaigns.length === 0 ? "No campaigns yet. Create your first campaign." : "No campaigns match your search."} />;
          }}
        </CloudCampaigns>
      </section>
    </div>
  );
}
