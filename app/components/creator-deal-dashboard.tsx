"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Megaphone } from "lucide-react";
import {
  dealStage,
  type CreatorDealRow,
  type CreatorDealStage,
} from "@/lib/creator-deal-history";
import { latestCounterAmount } from "@/lib/assigned-deals";
import type { DealOffer } from "@/lib/assigned-deal-store";
import { acceptanceColors, acceptanceLabels } from "./campaign-creators-panel";
import { StatCard } from "./stat-card";

export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

const offerEventLabels: Record<DealOffer["event"], string> = {
  offer: "sent an offer of",
  counter: "countered with",
  accept: "accepted",
  confirm: "confirmed",
  decline: "declined",
};

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

const pageSize = 10;

export function CreatorDealDashboard({ creatorId }: { creatorId: string }) {
  const [deals, setDeals] = useState<CreatorDealRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [monthWindowStart, setMonthWindowStart] = useState(0);
  const [dateSort, setDateSort] = useState<{ column: "dealDate" | "dueDate"; direction: "ascending" | "descending" }>({ column: "dealDate", direction: "descending" });
  const [visiblePages, setVisiblePages] = useState(1);
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);

  const refreshDeals = async () => {
    try {
      const response = await fetch(`/api/manager/creators/${creatorId}/deals`);
      const body = await response.json();
      if (response.ok) setDeals(body.deals ?? []);
    } catch { /* The next explicit action will surface a connection error. */ }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/manager/creators/${creatorId}/deals`);
        const body = await response.json();
        if (cancelled) return;
        if (!response.ok) { setError(body.error ?? "Could not load deals."); return; }
        setDeals(body.deals ?? []);
      } catch {
        if (!cancelled) setError("Could not reach the server. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [creatorId]);

  // Declined deals are not counted in the totals, matching the summary used elsewhere.
  const liveDeals = deals.filter((deal) => dealStage(deal) !== "declined");
  const recentMonths = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(`${currentMonth}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - index);
    return date.toISOString().slice(0, 7);
  });
  const allMonths = Array.from(new Set([
    ...recentMonths,
    ...liveDeals.filter((deal) => deal.dueDate).map((deal) => deal.dueDate!.slice(0, 7)),
  ])).sort().reverse();
  const visibleMonths = allMonths.slice(monthWindowStart, monthWindowStart + 4);

  const monthLabel = selectedMonth === "all" ? "All Months" : formatMonth(selectedMonth);
  const monthlyDeals = selectedMonth === "all"
    ? liveDeals
    : liveDeals.filter((deal) => deal.dueDate?.startsWith(selectedMonth));
  const totalValue = monthlyDeals.reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0);
  const received = monthlyDeals
    .filter((deal) => deal.moneyReceived)
    .reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0);
  const pending = totalValue - received;

  const sortedDeals = [...monthlyDeals].sort((a, b) => {
    const comparison = (a[dateSort.column] ?? "").localeCompare(b[dateSort.column] ?? "");
    return (dateSort.direction === "ascending" ? comparison : -comparison) || a.id.localeCompare(b.id);
  });
  const recentDeals = sortedDeals.slice(0, visiblePages * pageSize);
  const totalPages = Math.ceil(sortedDeals.length / pageSize);

  function selectMonth(month: string) {
    setSelectedMonth(month);
    setVisiblePages(1);
  }
  function toggleDateSort(column: "dealDate" | "dueDate") {
    setDateSort((current) => ({
      column,
      direction: current.column === column && current.direction === "descending" ? "ascending" : "descending",
    }));
    setVisiblePages(1);
  }

  const pillClass = (active: boolean) =>
    `shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
      active ? "bg-[#e8efff] text-[#0655ff]" : "bg-[#f5f7fb] text-[#465a80] hover:bg-[#e8edf7]"
    }`;

  return (
    <section aria-labelledby="creator-deals-heading">
      <h2 id="creator-deals-heading" className="mb-4 text-lg font-bold">Deals</h2>

      {loading ? (
        <p className="text-sm text-[#53668e]">Loading deals…</p>
      ) : error ? (
        <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>
      ) : (
        <>
          <section aria-label="View by month" className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <p className="shrink-0 text-sm font-medium text-[#23365d]">View by month:</p>
            <div className="flex min-w-0 flex-wrap items-center gap-2 py-1">
              <button
                type="button"
                aria-label="Show newer months"
                disabled={monthWindowStart === 0}
                onClick={() => setMonthWindowStart((current) => Math.max(0, current - 1))}
                className="shrink-0 cursor-pointer rounded-full bg-[#f5f7fb] px-3 py-2.5 text-sm font-medium text-[#465a80] hover:bg-[#e8edf7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button type="button" aria-pressed={selectedMonth === "all"} onClick={() => selectMonth("all")} className={pillClass(selectedMonth === "all")}>
                All Months
              </button>
              {visibleMonths.map((month) => (
                <button key={month} type="button" aria-pressed={selectedMonth === month} onClick={() => selectMonth(month)} className={pillClass(selectedMonth === month)}>
                  {formatMonth(month)}
                </button>
              ))}
              <button
                type="button"
                aria-label="Show older months"
                disabled={monthWindowStart + 4 >= allMonths.length}
                onClick={() => setMonthWindowStart((current) => current + 1)}
                className="shrink-0 cursor-pointer rounded-full bg-[#f5f7fb] px-3 py-2.5 text-sm font-medium text-[#465a80] hover:bg-[#e8edf7] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </section>

          <section aria-label={`Totals for ${monthLabel}`} className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Total Deals" value={String(monthlyDeals.length)} />
            <StatCard title="Total Deal Value" value={formatMoney(totalValue)} />
            <StatCard title="Money Received" value={formatMoney(received)} />
            <StatCard title="Pending Payment" value={formatMoney(pending)} />
          </section>

          <section aria-labelledby="creator-recent-deals-heading" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
            <div className="border-b border-[#e5ebf5] px-5 py-5">
              <h3 id="creator-recent-deals-heading" className="text-lg font-bold">Recent Deals</h3>
            </div>
            {recentDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Megaphone className="h-5 w-5" strokeWidth={2} />
                </span>
                <p className="text-sm font-semibold text-[#101c40]">{liveDeals.length === 0 ? "No deals yet" : "No deals in this month"}</p>
                <p className="max-w-sm text-sm text-[#53668e]">
                  {liveDeals.length === 0
                    ? "Add this creator to a campaign from the campaign's detail page to start a deal."
                    : `No deals due in ${monthLabel}. Choose another month to see this creator's collaborations.`}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">Up to {recentDeals.length} deals, sorted by {dateSort.column === "dueDate" ? "content due date" : "deal date"}, {dateSort.direction === "ascending" ? "earliest first" : "latest first"}. {selectedMonth === "all" ? "All months." : `Content due in ${monthLabel}.`}</caption>
                    <thead className="bg-[#f5f7fb] text-xs text-[#405579]">
                      <tr>
                        <th scope="col" className="whitespace-nowrap px-5 py-3 font-medium">Brand</th>
                        <th scope="col" className="whitespace-nowrap px-5 py-3 font-medium">Campaign</th>
                        <th scope="col" className="whitespace-nowrap px-5 py-3 font-medium">Amount</th>
                        {([{ column: "dealDate", label: "Deal Date" }, { column: "dueDate", label: "Content Due" }] as const).map(({ column, label }) => (
                          <th key={column} scope="col" aria-sort={dateSort.column === column ? dateSort.direction : "none"} className="whitespace-nowrap px-5 py-3 font-medium">
                            <button
                              type="button"
                              onClick={() => toggleDateSort(column)}
                              aria-label={`Sort ${label} ${dateSort.column === column && dateSort.direction === "descending" ? "earliest first" : "latest first"}`}
                              className={`inline-flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 ${dateSort.column === column ? "text-blue-600" : ""}`}
                            >
                              {label}
                              <span aria-hidden="true">{dateSort.column === column ? (dateSort.direction === "descending" ? "↓" : "↑") : "↕"}</span>
                            </button>
                          </th>
                        ))}
                        <th scope="col" className="whitespace-nowrap px-5 py-3 font-medium">Status</th>
                        <th scope="col" className="whitespace-nowrap px-5 py-3 font-medium">Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDeals.map((deal) => {
                        const stage = dealStage(deal);
                        const expanded = expandedDealId === deal.id;
                        return (
                          <Fragment key={deal.id}>
                          <tr
                            onClick={() => setExpandedDealId(expanded ? null : deal.id)}
                            className="cursor-pointer border-t border-[#edf1f8] hover:bg-[#fafbfe]"
                          >
                            <td className="whitespace-nowrap px-5 py-4 font-medium">
                              <span className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  aria-expanded={expanded}
                                  aria-label={`${expanded ? "Hide" : "Show"} details for ${deal.brand || "deal"}`}
                                  onClick={(event) => { event.stopPropagation(); setExpandedDealId(expanded ? null : deal.id); }}
                                  className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                                >
                                  {expanded ? <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> : <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
                                </button>
                                {deal.brand || "—"}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-4">
                              {deal.campaign ? (
                                <Link href={`/manager/campaigns/${deal.campaign.id}`} onClick={(event) => event.stopPropagation()} className="text-blue-600 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-600">
                                  {deal.campaign.title}
                                </Link>
                              ) : "—"}
                            </td>
                            <td className="whitespace-nowrap px-5 py-4 tabular-nums">{formatMoney(Number(deal.amount) || 0)}</td>
                            <td className="whitespace-nowrap px-5 py-4">{formatDate(deal.dealDate)}</td>
                            <td className="whitespace-nowrap px-5 py-4">{formatDate(deal.dueDate)}</td>
                            <td className="px-5 py-4">
                              {deal.acceptanceStatus ? (
                                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${acceptanceColors[deal.acceptanceStatus]}`}>
                                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                                  {acceptanceLabels[deal.acceptanceStatus]}
                                </span>
                              ) : (
                                <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${stageColors[stage]}`}>{stageLabels[stage]}</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className={deal.moneyReceived ? "text-xs font-medium text-emerald-700" : "text-xs font-medium text-amber-700"}>
                                {deal.moneyReceived ? "Paid" : "Unpaid"}
                              </span>
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="border-t border-[#edf1f8] bg-[#f8faff]">
                              <td colSpan={7} className="px-5 py-5">
                                <CreatorDealDetails key={deal.id} creatorId={creatorId} deal={deal} onChanged={() => void refreshDeals()} />
                              </td>
                            </tr>
                          )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {visiblePages < totalPages && (
                  <div className="border-t border-[#edf1f8] px-5 py-4 text-center">
                    <button type="button" onClick={() => setVisiblePages((current) => current + 1)} className="cursor-pointer text-sm font-medium text-[#5478b5] hover:text-[#0655ff]">
                      Show more deals
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}

function CreatorDealDetails({ creatorId, deal, onChanged }: { creatorId: string; deal: CreatorDealRow; onChanged: () => void }) {
  const [offers, setOffers] = useState<DealOffer[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const campaignId = deal.campaign?.id ?? deal.campaignId;
  const negotiationUrl = campaignId ? `/api/manager/campaigns/${campaignId}/creators/${creatorId}/deals/negotiation` : null;

  useEffect(() => {
    if (!negotiationUrl) return;
    let cancelled = false;
    fetch(negotiationUrl)
      .then(async (response) => ({ ok: response.ok, body: await response.json() }))
      .then(({ ok, body }) => {
        if (cancelled) return;
        if (!ok) { setError(body.error ?? "Could not load the offer history."); return; }
        setOffers(body.offers ?? []);
      })
      .catch(() => { if (!cancelled) setError("Could not load the offer history. Check your connection and try again."); });
    return () => { cancelled = true; };
  }, [negotiationUrl]);

  async function respond(action: "confirm" | "decline") {
    if (!negotiationUrl) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(negotiationUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Could not update this deal."); return; }
      onChanged();
      const refreshed = await fetch(negotiationUrl);
      if (refreshed.ok) setOffers((await refreshed.json()).offers ?? []);
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  const status = deal.acceptanceStatus;
  const counterAmount = offers ? latestCounterAmount(offers) : null;
  const shownAmount = status === "countered" && counterAmount !== null ? counterAmount : Number(deal.amount) || 0;
  const dueLabel = formatDate(deal.dueDate);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-[#101c40]">{deal.campaign?.title ?? "Deal"} details</p>
        {deal.campaign && (
          <Link href={`/manager/campaigns/${deal.campaign.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Open campaign
          </Link>
        )}
      </div>

      <section aria-label="Deal summary" className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Amount" value={formatMoney(shownAmount)} />
        <StatCard title="Due date" value={dueLabel} />
        <StatCard title="Status" value={status ? acceptanceLabels[status] : stageLabels[dealStage(deal)]} />
      </section>

      {status === "countered" && (
        <p className="mb-4 text-sm text-[#405579]">
          Creator countered at {formatMoney(shownAmount)}. Accept or decline it here, or send a different counter-offer from the campaign.
        </p>
      )}

      {negotiationUrl && (status === "countered" || status === "pending" || status === "accepted") && (
        <div className="mb-4 flex flex-wrap gap-2">
          {(status === "countered" || status === "accepted") && (
            <button type="button" onClick={() => void respond("confirm")} disabled={busy} className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {status === "countered" ? "Accept counter-offer" : "Confirm amount"}
            </button>
          )}
          {(status === "countered" || status === "pending") && (
            <button type="button" onClick={() => void respond("decline")} disabled={busy} className="cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
              {status === "countered" ? "Decline counter-offer" : "Decline offer"}
            </button>
          )}
        </div>
      )}

      {error && <p role="alert" className="mb-4 text-sm font-medium text-rose-700">{error}</p>}

      <div className="rounded-xl border border-[#e5ebf5] bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[#53668e]">Offer history</p>
        {!negotiationUrl ? (
          <p className="mt-2 text-sm text-[#53668e]">This deal is not linked to a campaign.</p>
        ) : offers === null ? (
          <p className="mt-2 text-sm text-[#53668e]">Loading offer history…</p>
        ) : offers.length === 0 ? (
          <p className="mt-2 text-sm text-[#53668e]">No offers recorded yet.</p>
        ) : (
          <ol className="mt-2 space-y-2">
            {offers.map((offer, index) => (
              <li key={`${offer.created_at}-${index}`} className="text-sm">
                <span className="font-medium">{offer.actor === "manager" ? "You" : "Creator"}</span>{" "}
                {offerEventLabels[offer.event]}{offer.event !== "accept" && offer.event !== "decline" && offer.event !== "confirm" ? ` ${formatMoney(offer.amount)}` : ""}
                <span className="ml-2 text-xs text-[#53668e]">{new Date(offer.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                {offer.note && <p className="mt-0.5 text-[#405579]">&ldquo;{offer.note}&rdquo;</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
