"use client";

import Link from "next/link";
import { Plus, type LucideIcon, Megaphone, Zap, Users, Handshake } from "lucide-react";
import { CloudCampaigns } from "./cloud-campaigns";
import { CampaignTable } from "./campaign-table";
import { useEffect, useState } from "react";

type Metrics = { totalCampaigns: number; activeCampaigns: number; totalCreators: number; totalDeals: number };

function StatCard({ title, value, icon: Icon, tint }: { title: string; value: string; icon: LucideIcon; tint: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(16,24,64,0.08)]">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0 pt-1">
        <p className="text-sm font-medium text-[#405579]">{title}</p>
        <p className="mt-4 break-words text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function useDashboardMetrics(workspaceId: string) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  useEffect(() => {
    let active = true;
    fetch(`/api/manager/dashboard?workspaceId=${encodeURIComponent(workspaceId)}`)
      .then(response => response.ok ? response.json() : null)
      .then(body => { if (active && body) setMetrics(body.metrics); })
      .catch(() => {});
    return () => { active = false; };
  }, [workspaceId]);
  return metrics;
}

export function ManagerDashboardClient({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const metrics = useDashboardMetrics(workspaceId);

  return (
    <div>
      <div className="mb-9 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
          <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Here&rsquo;s {workspaceName}&rsquo;s agency overview.</p>
        </div>
        <Link href="/manager/campaigns/new" className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          <Plus className="h-4 w-4" strokeWidth={2.4} /> Create Campaign
        </Link>
      </div>

      <section aria-label="Agency metrics" className="mb-9 grid grid-cols-2 gap-4 sm:mb-10 lg:grid-cols-4">
        <StatCard icon={Megaphone} tint="bg-purple-50 text-purple-600" title="Total Campaigns" value={(metrics?.totalCampaigns ?? 0).toString()} />
        <StatCard icon={Zap} tint="bg-emerald-50 text-emerald-600" title="Active Campaigns" value={(metrics?.activeCampaigns ?? 0).toString()} />
        <StatCard icon={Users} tint="bg-teal-50 text-teal-600" title="Creators" value={(metrics?.totalCreators ?? 0).toString()} />
        <StatCard icon={Handshake} tint="bg-brand-50 text-brand-600" title="Active Deals" value={(metrics?.totalDeals ?? 0).toString()} />
      </section>

      <section aria-labelledby="recent-campaigns-heading" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
          <h2 id="recent-campaigns-heading" className="text-lg font-bold">Recent Campaigns</h2>
          <Link href="/manager/campaigns" className="shrink-0 text-sm font-medium text-brand-600 hover:underline">View all →</Link>
        </div>
        <CloudCampaigns workspaceId={workspaceId}>
          {(campaigns) => <CampaignTable campaigns={campaigns.slice(0, 5)} emptyMessage="No campaigns yet. Create your first campaign to get started." />}
        </CloudCampaigns>
      </section>
    </div>
  );
}
