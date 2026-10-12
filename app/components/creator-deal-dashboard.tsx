"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import {
  dealStage,
  groupDealsByCampaign,
  type CreatorDealRow,
  type CreatorDealSummary,
  type CreatorDealStage,
} from "@/lib/creator-deal-history";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { acceptanceLabels } from "./campaign-creators-panel";

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

const stageLabels: Record<CreatorDealStage, string> = {
  active: "Active",
  completed: "Completed",
  declined: "Declined",
};
const stageColors: Record<CreatorDealStage, string> = {
  active: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  declined: "bg-slate-100 text-slate-600",
};

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[#53668e]">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#101c40]">{value}</p>
    </div>
  );
}

export function CreatorDealDashboard({ creatorId }: { creatorId: string }) {
  const [deals, setDeals] = useState<CreatorDealRow[]>([]);
  const [summary, setSummary] = useState<CreatorDealSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/manager/creators/${creatorId}/deals`);
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) { setError(body.error ?? "Could not load deals."); return; }
        setDeals(body.deals ?? []);
        setSummary(body.summary ?? null);
      } catch {
        if (!cancelled) setError("Could not reach the server. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [creatorId]);

  return (
    <section aria-labelledby="creator-deals-heading">
      <h2 id="creator-deals-heading" className="mb-3 text-lg font-bold">Deals</h2>

      {loading ? (
        <p className="text-sm text-[#53668e]">Loading deals…</p>
      ) : error ? (
        <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>
      ) : (
        <>
          {summary && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Active deals" value={String(summary.activeCount)} />
              <SummaryCard label="Active value" value={formatMoney(summary.activeValue)} />
              <SummaryCard label="Completed" value={String(summary.completedCount)} />
              <SummaryCard label="Money received" value={formatMoney(summary.completedValue)} />
            </div>
          )}

          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d7e0f0] bg-[#f7f9fd] px-6 py-14 text-center">
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Megaphone className="h-5 w-5" strokeWidth={2} />
              </span>
              <p className="text-sm font-semibold text-[#101c40]">No deals yet</p>
              <p className="max-w-sm text-sm text-[#53668e]">Add this creator to a campaign from the campaign&apos;s detail page to start a deal.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {groupDealsByCampaign(deals).map((group) => (
                <div key={group.campaign?.id ?? "other"} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5ebf5] px-5 py-4">
                    {group.campaign ? (
                      <Link href={`/manager/campaigns/${group.campaign.id}`} className="group flex items-center gap-3">
                        <span className="text-sm font-semibold text-[#101c40] group-hover:text-brand-700">{group.campaign.title}</span>
                        {group.campaign.brand && <span className="text-xs text-[#53668e]">{group.campaign.brand}</span>}
                        <CampaignStatusBadge status={group.campaign.status as Parameters<typeof CampaignStatusBadge>[0]["status"]} />
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-[#101c40]">Other deals</span>
                    )}
                    <span className="text-xs text-[#53668e]">{group.deals.length} {group.deals.length === 1 ? "deal" : "deals"}</span>
                  </div>
                  <ul className="divide-y divide-[#e5ebf5]">
                    {group.deals.map((deal) => {
                      const stage = dealStage(deal);
                      return (
                        <li key={deal.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
                          <div className="flex items-center gap-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${stageColors[stage]}`}>{stageLabels[stage]}</span>
                            {deal.acceptanceStatus && <span className="text-[#53668e]">{acceptanceLabels[deal.acceptanceStatus]}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-5 tabular-nums">
                            <span className="text-xs text-[#53668e]">Due {formatDate(deal.dueDate)}</span>
                            <span className="font-semibold text-[#101c40]">{formatMoney(Number(deal.amount) || 0)}</span>
                            <span className={deal.moneyReceived ? "text-xs font-medium text-emerald-700" : "text-xs font-medium text-amber-700"}>
                              {deal.moneyReceived ? "Paid" : "Unpaid"}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
