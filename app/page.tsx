"use client";

import { Fragment, useRef, useState } from "react";
import { type Deal, type Deliverable, isDeliverables, isDeal, isInstagramUrl, todayDate, dealDateError } from "@/lib/deals";
import { CloudDashboard } from "./components/cloud-dashboard";

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatMonth = (month: string, style: "short" | "long") =>
  new Intl.DateTimeFormat("en-IN", {
    month: style,
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));

export default function Home() {
  return <CloudDashboard>{(deals, persistDeal, removeDeal) => <Dashboard deals={deals} persistDeal={persistDeal} removeDeal={removeDeal} />}</CloudDashboard>;
}

function Dashboard({ deals, persistDeal, removeDeal }: { deals: Deal[]; persistDeal: (deal: Deal) => Promise<string | null>; removeDeal: (id: string) => Promise<string | null> }) {
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  async function deleteDeal(deal: Deal) {
    if (deletingId || !window.confirm(`Delete the deal for ${deal.brand}? This permanently removes it from Supabase and cannot be undone.`)) return;
    setDeletingId(deal.id);
    setExpandedDeal(null);
    setNotice("");
    try {
      const error = await removeDeal(deal.id);
      setNotice(error ?? `${deal.brand} deleted.`);
    } catch { setNotice("Could not delete the deal. Please try again."); }
    finally { setDeletingId(null); }
  }
  const [newDeal, setNewDeal] = useState<Deal | null>(null);
  async function saveDeal(updated: Deal) {
    const error = await persistDeal(updated);
    if (error) return error;
    setExpandedDeal(null);
    setNewDeal(null);
    setNotice(`${updated.brand} saved.${selectedMonth !== "all" && !updated.dueDate.startsWith(selectedMonth) ? ` Find it under ${formatMonth(updated.dueDate.slice(0, 7), "long")}.` : ""}`);
    return null;
  }
  // Anchor the shortcuts to the calendar month, not the newest deal's deadline.
  const [currentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const recentMonths = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(`${currentMonth}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - index);
    return date.toISOString().slice(0, 7);
  });
  // Include months with deals (even future ones) so they aren't hidden behind older pills.
  const allMonths = Array.from(new Set([
    ...recentMonths,
    ...deals.map((deal) => deal.dueDate.slice(0, 7)),
  ])).sort().reverse();
  const [monthWindowStart, setMonthWindowStart] = useState(0);
  const visibleMonths = allMonths.slice(monthWindowStart, monthWindowStart + 4);

  const [dateSort, setDateSort] = useState<{
    column: "dealDate" | "dueDate";
    direction: "ascending" | "descending";
  } | null>(null);
  function toggleDateSort(column: "dealDate" | "dueDate") {
    setDateSort(current => ({
      column,
      direction: current?.column === column && current.direction === "descending" ? "ascending" : "descending",
    }));
    setExpandedDeal(null);
    setVisiblePages(1);
  }
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const monthLabel = selectedMonth === "all" ? "All Months" : formatMonth(selectedMonth, "long");
  const monthlyDeals = selectedMonth === "all"
    ? deals
    : deals.filter((deal) => deal.dueDate.startsWith(selectedMonth));
  const totalValue = monthlyDeals.reduce((sum, deal) => sum + deal.amount, 0);

  const received = monthlyDeals
    .filter((deal) => deal.moneyReceived)
    .reduce((sum, deal) => sum + deal.amount, 0);

  const pending = totalValue - received;
  const sortedDeals = [...monthlyDeals]
    .sort((a, b) => {
      const column = dateSort?.column ?? "dealDate";
      const comparison = a[column].localeCompare(b[column]);
      return (dateSort?.direction === "ascending" ? comparison : -comparison) || a.id.localeCompare(b.id);
    });
  const pageSize = 10;
  const [visiblePages, setVisiblePages] = useState(1);
  const recentDeals = sortedDeals.slice(0, visiblePages * pageSize);
  const totalPages = Math.ceil(sortedDeals.length / pageSize);

  return (
    <div className="min-h-screen bg-[#f0f4f9] p-2 text-[#101c40] sm:p-4">
      <a href="#dashboard" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to dashboard</a>
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_#20345c08] md:flex-row">
        <Sidebar />
        <main id="dashboard" className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">

        {/* Header */}
        <div className="mb-9 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Hi, Piyush <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">
              Here’s your brand deal overview.
            </p>
          </div>

          <button type="button" onClick={() => setNewDeal({ id: crypto.randomUUID(), brand: "", amount: 0, dealDate: todayDate(), dueDate: todayDate(), contentCreated: false, posted: false, moneyReceived: false })} className="rounded-lg bg-[#243657] px-5 py-3 text-sm font-semibold text-white shadow-[0_3px_10px_#20345c20] transition-colors hover:bg-[#172846] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            + Add Brand Deal
          </button>
        </div>

        {newDeal && <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <DealEditor deal={newDeal} onSave={saveDeal} onCancel={() => setNewDeal(null)} />
        </section>}
        <section
          aria-label="View by month"
          className="mb-7 flex flex-wrap items-center gap-x-5 gap-y-3"
        >
          <p className="shrink-0 text-sm font-medium text-[#23365d]">View by month:</p>
          <div className="flex min-w-0 flex-wrap items-center gap-2 py-1">
            <button
              type="button"
              aria-label="Show newer months"
              disabled={monthWindowStart === 0}
              onClick={() => setMonthWindowStart((current) => Math.max(0, current - 1))}
              className="shrink-0 cursor-pointer rounded-full bg-[#f5f7fb] px-3 py-2.5 text-sm font-medium text-[#465a80] hover:bg-[#e8edf7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              aria-pressed={selectedMonth === "all"}
              onClick={() => { setSelectedMonth("all"); setExpandedDeal(null); setDetailsId(null); setVisiblePages(1); }}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                selectedMonth === "all"
                  ? "bg-[#e8efff] text-[#0655ff]"
                  : "bg-[#f5f7fb] text-[#465a80] hover:bg-[#e8edf7]"
              }`}
            >
              All Months
            </button>
            {visibleMonths.map((month) => (
              <button
                key={month}
                type="button"
                aria-pressed={selectedMonth === month}
                onClick={() => { setSelectedMonth(month); setExpandedDeal(null); setDetailsId(null); setVisiblePages(1); }}
                className={`shrink-0 cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  selectedMonth === month
                    ? "bg-[#e8efff] text-[#0655ff]"
                    : "bg-[#f5f7fb] text-[#465a80] hover:bg-[#e8edf7]"
                }`}
              >
                {formatMonth(month, "short")}
              </button>
            ))}
            <button
              type="button"
              aria-label="Show older months"
              disabled={monthWindowStart + 4 >= allMonths.length}
              onClick={() => setMonthWindowStart((current) => Math.min(allMonths.length - 4, current + 1))}
              className="shrink-0 cursor-pointer rounded-full bg-[#f5f7fb] px-3 py-2.5 text-sm font-medium text-[#465a80] hover:bg-[#e8edf7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </section>

        <p role="status" className="mb-4 text-sm text-[#53668e]">{notice}</p>

        {/* Dashboard Cards */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="deals" title="Total Deals" value={monthlyDeals.length.toString()} />
          <StatCard icon="value" title="Total Deal Value" value={formatMoney(totalValue)} />
          <StatCard icon="received" title="Money Received" value={formatMoney(received)} />
          <StatCard icon="pending" title="Pending Payment" value={formatMoney(pending)} />
        </section>

        {/* Recent deals use the same month filter as the summary cards. */}
        <section aria-labelledby="recent-deals-heading" className="overflow-hidden rounded-xl border border-[#e5ebf5] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
            <h2 id="recent-deals-heading" className="text-lg font-bold">Recent Deals</h2>
            <button type="button" disabled title="The full Deals page is coming soon" className="shrink-0 cursor-not-allowed text-sm text-[#5478b5]">
              View all <span aria-hidden="true">→</span><span className="sr-only"> (coming soon)</span>
            </button>
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Up to {recentDeals.length} deals, sorted by {dateSort?.column === "dueDate" ? "content due date" : "deal date"}, {dateSort?.direction === "ascending" ? "earliest first" : "latest first"}. {selectedMonth === "all" ? "All months." : `Content due in ${monthLabel}.`}</caption>
              <thead className="bg-[#f5f7fb] text-xs text-[#405579]">
                <tr>
                  {["Brand", "Amount"].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{label}</th>)}
                  {([{ column: "dealDate", label: "Deal Date" }, { column: "dueDate", label: "Content Due" }] as const).map(({ column, label }) => (
                    <th key={column} scope="col" aria-sort={dateSort?.column === column ? dateSort.direction : "none"} className="whitespace-nowrap px-5 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleDateSort(column)}
                        aria-label={`Sort ${label} ${dateSort?.column === column && dateSort.direction === "descending" ? "earliest first" : "latest first"}`}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600 ${dateSort?.column === column ? "text-blue-600" : ""}`}
                      >
                        {label}
                        <span aria-hidden="true">{dateSort?.column === column ? (dateSort.direction === "descending" ? "↓" : "↑") : "↕"}</span>
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="whitespace-nowrap px-5 py-3 font-medium">Status</th>
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody>
                {recentDeals.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-[#53668e]">
                    {deals.length === 0 ? "No brand deals yet." : `No brand deals due in ${monthLabel}. Choose another month to see your collaborations.`}
                  </td></tr>
                )}
                {recentDeals.map((deal) => (
                  <Fragment key={deal.id}>
                    <tr onClick={(event) => {
                      if ((event.target as HTMLElement).closest("button, a, [popover]")) return;
                      setDetailsId(detailsId === deal.id ? null : deal.id);
                    }} className={`cursor-pointer border-t border-[#edf1f8] hover:bg-[#fafbfe] ${detailsId === deal.id ? "bg-[#f8faff]" : ""}`}>

                      <td className="min-w-32 px-5 py-4 font-medium">
                        <button type="button" aria-label={`Deliverables for ${deal.brand}`} aria-expanded={detailsId === deal.id} aria-controls={`deliverables-${deal.id}`} onClick={() => setDetailsId(detailsId === deal.id ? null : deal.id)} className="mr-2 cursor-pointer rounded px-1 py-1 text-slate-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
                          <span aria-hidden="true">{detailsId === deal.id ? "▾" : "▸"}</span>
                        </button>
                        {isInstagramUrl(deal.instagramUrl) ? (
                          <a href={deal.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`${deal.brand} on Instagram (opens in a new tab)`} className="rounded text-blue-600 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600">
                            {deal.brand}<span aria-hidden="true" className="ml-1 text-xs">↗</span>
                          </a>
                        ) : deal.brand}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 tabular-nums">{formatMoney(deal.amount)}</td>
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(deal.dealDate)}</td>
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(deal.dueDate)}</td>
                      <td className="px-5 py-4"><DealStatus deal={deal} /></td>
                      <td className="px-3 py-2">
                        <DealActions deal={deal} disabled={deletingId !== null} onEdit={() => setExpandedDeal(deal.id)} onDelete={() => void deleteDeal(deal)} />
                      </td>
                    </tr>
                    <tr id={`deliverables-${deal.id}`} hidden={detailsId !== deal.id} className="border-t border-[#edf1f8] bg-[#f8faff]">
                      <td colSpan={6} className="px-6 py-5">
                        <DealDetails deal={deal} />
                      </td>
                    </tr>
                    <tr id={`details-${deal.id}`} hidden={expandedDeal !== deal.id} className="border-t border-[#edf1f8] bg-[#f8faff]">
                      <td colSpan={6} className="px-5 py-4">
                        {expandedDeal === deal.id && <DealEditor deal={deal} onSave={saveDeal} onCancel={() => setExpandedDeal(null)} />}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[#edf1f8] sm:hidden">
            {recentDeals.length === 0 && (
              <p className="px-5 py-12 text-center text-sm text-[#53668e]">
                {deals.length === 0 ? "No brand deals yet." : `No brand deals due in ${monthLabel}. Choose another month to see your collaborations.`}
              </p>
            )}
            {recentDeals.map((deal) => (
              <div key={deal.id}>
                <div onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button, a, [popover]")) return;
                  setDetailsId(detailsId === deal.id ? null : deal.id);
                }} className={`cursor-pointer px-5 py-4 ${detailsId === deal.id ? "bg-[#f8faff]" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-medium">
                        <button type="button" aria-label={`Deliverables for ${deal.brand}`} aria-expanded={detailsId === deal.id} aria-controls={`deliverables-${deal.id}`} onClick={() => setDetailsId(detailsId === deal.id ? null : deal.id)} className="shrink-0 cursor-pointer rounded px-1 py-1 text-slate-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
                          <span aria-hidden="true">{detailsId === deal.id ? "▾" : "▸"}</span>
                        </button>
                        <span className="break-words">
                          {isInstagramUrl(deal.instagramUrl) ? (
                            <a href={deal.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`${deal.brand} on Instagram (opens in a new tab)`} className="rounded text-blue-600 underline decoration-blue-200 underline-offset-4 hover:decoration-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600">
                              {deal.brand}<span aria-hidden="true" className="ml-1 text-xs">↗</span>
                            </a>
                          ) : deal.brand}
                        </span>
                      </div>
                      <p className="mt-1 pl-6 text-sm tabular-nums text-[#53668e]">{formatMoney(deal.amount)}</p>
                    </div>
                    <DealActions deal={deal} disabled={deletingId !== null} onEdit={() => setExpandedDeal(deal.id)} onDelete={() => void deleteDeal(deal)} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-6 text-xs text-[#53668e]">
                    <span>Deal: {formatDate(deal.dealDate)}</span>
                    <span>Due: {formatDate(deal.dueDate)}</span>
                    <DealStatus deal={deal} />
                  </div>
                </div>
                <div id={`deliverables-${deal.id}`} hidden={detailsId !== deal.id} className="bg-[#f8faff] px-5 py-5">
                  <DealDetails deal={deal} />
                </div>
                <div id={`details-${deal.id}`} hidden={expandedDeal !== deal.id} className="bg-[#f8faff] px-5 py-4">
                  {expandedDeal === deal.id && <DealEditor deal={deal} onSave={saveDeal} onCancel={() => setExpandedDeal(null)} />}
                </div>
              </div>
            ))}
          </div>
          {sortedDeals.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f8] px-5 py-4">
              <p className="text-sm text-[#53668e]">Showing {recentDeals.length} of {sortedDeals.length} deals</p>
              {visiblePages < totalPages && (
                <button
                  type="button"
                  onClick={() => setVisiblePages((current) => current + 1)}
                  className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#0655ff] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  Show more (page {visiblePages + 1} of {totalPages})
                </button>
              )}
            </div>
          )}
        </section>
        </main>
      </div>
    </div>
  );
}

function DealDetails({ deal }: { deal: Deal }) {
  const [copyNotice, setCopyNotice] = useState("");
  const phone = deal.contactPhone && /^\+[1-9]\d{6,14}$/.test(deal.contactPhone) ? deal.contactPhone.slice(1) : null;
  const contact = [deal.contactName, deal.contactEmail, deal.contactPhone].filter(Boolean).join("\n");
  const labels = { Reel: "Instagram Reel", Story: "Instagram Stories", Post: "Instagram Post", "Ad Rights": "Ad rights", Other: "Other deliverable" };
  return (
    <div className="rounded-xl border border-[#e9e6f5] bg-gradient-to-br from-[#fff7fa] to-[#f1f6ff] p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-xl font-bold">{deal.brand}</h3>
          {deal.category && <p className="mt-1 text-sm text-[#53668e]">{deal.category}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:flex-1 lg:max-w-2xl lg:grid-cols-4">
          {[{ label: "Deal Date", value: formatDate(deal.dealDate) }, { label: "Content Due", value: formatDate(deal.dueDate) }, { label: "Amount", value: formatMoney(deal.amount) }].map(item => (
            <div key={item.label} className="rounded-lg border border-white bg-white/80 px-4 py-3"><dt className="text-xs text-[#53668e]">{item.label}</dt><dd className="mt-1 text-sm font-medium">{item.value}</dd></div>
          ))}
          <div className="rounded-lg border border-white bg-white/80 px-4 py-3"><dt className="mb-1 text-xs text-[#53668e]">Status</dt><dd><DealStatus deal={deal} /></dd></div>
        </dl>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-[#e5ebf5] bg-white p-4">
          <h4 className="mb-3 font-semibold">Deliverables</h4>
          {deal.deliverables?.length ? <ul className="space-y-2">
            {deal.deliverables.map((item, index) => <li key={index} className={`flex items-center gap-3 rounded-lg px-3 py-3 ${index % 2 ? "bg-[#f0f5ff]" : "bg-[#fcf0fa]"}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5 shrink-0 text-violet-600"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".7" /></svg>
              <span className="text-sm">{labels[item.type]}</span><span className="ml-auto whitespace-nowrap text-sm font-semibold">{item.type === "Ad Rights" ? `${item.quantity} month${item.quantity === 1 ? "" : "s"}` : `${item.quantity} ×`}</span>
            </li>)}
          </ul> : <p className="py-4 text-sm text-[#53668e]">No deliverables added yet.</p>}
        </section>
        <div className="space-y-4">
          <section className="rounded-xl border border-[#e5ebf5] bg-white p-4">
            <h4 className="mb-2 font-semibold">Notes</h4><p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#53668e]">{deal.notes || "No notes added yet."}</p>
          </section>
          <section className="rounded-xl border border-[#e5ebf5] bg-white p-4">
            <h4 className="mb-2 font-semibold">Contact</h4>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#53668e]">{contact || "No contact details added yet."}</p>
              <div className="flex items-center gap-2">
                {phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">WhatsApp<span className="sr-only"> (opens in a new tab)</span></a>}
                {contact && <button type="button" onClick={async () => {
                  try { await navigator.clipboard.writeText(contact); setCopyNotice("Contact copied."); }
                  catch { setCopyNotice("Could not copy. Select and copy the contact text above."); }
                }} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">Copy contact</button>}
              </div>
            </div>
            <p role="status" className="mt-2 text-xs text-[#53668e]">{copyNotice}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function DealActions({ deal, onEdit, onDelete, disabled }: { deal: Deal; onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  const popover = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const id = `actions-${deal.id}`;
  return (
    <>
      <button
        type="button"
        aria-label={`Actions for ${deal.brand}`}
        disabled={disabled}
        popoverTarget={id}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({
            top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 108)),
            left: Math.max(8, Math.min(rect.right - 128, window.innerWidth - 136)),
          });
        }}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#405579] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        aria-label={`Actions for ${deal.brand}`}
        style={position}
        className="fixed m-0 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
      >
        <button type="button" onClick={() => { popover.current?.hidePopover(); onEdit(); }} className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[#101c40] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
          Edit
        </button>
        <button type="button" onClick={() => { popover.current?.hidePopover(); onDelete(); }} className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600">
          Delete
        </button>
      </div>
    </>
  );
}

const navigation = [
  { label: "Dashboard", path: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9" },
  { label: "Deals", path: "M3 3h8l10 10-8 8L3 11V3Zm4 4h.01" },
  { label: "Calendar", path: "M8 2v5M16 2v5M3 10h18M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z" },
  { label: "Analytics", path: "M3 21h18M5 21V11h3v10M11 21V4h3v17M17 21V8h3v13" },
  { label: "Settings", path: "m9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3H9Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
];

function Sidebar() {
  return (
    <aside className="flex shrink-0 flex-col border-b border-[#edf1f8] bg-[#f7f9fd] px-4 py-5 md:w-52 md:border-r md:border-b-0 md:py-7 lg:w-56">
      <p className="mb-5 px-3 text-xl font-bold tracking-tight md:mb-8">BrandTracker</p>
      <nav aria-label="Main navigation" className="flex gap-2 overflow-x-auto pb-1 md:flex-1 md:flex-col md:overflow-visible">
        {navigation.map(({ label, path }) => {
          const active = label === "Dashboard";
          const classes = `flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${label === "Settings" ? "md:mt-auto" : ""} ${active ? "bg-[#e8efff] text-[#0655ff]" : "text-[#405579]"}`;
          const contents = <><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d={path} /></svg>{label}</>;
          return active ? (
            <a key={label} href="#dashboard" aria-current="page" className={`${classes} focus-visible:outline-2 focus-visible:outline-blue-600`}>{contents}</a>
          ) : (
            <button key={label} type="button" disabled title={`${label} is coming in a later milestone`} className={`${classes} cursor-not-allowed`}>{contents}<span className="sr-only"> (coming soon)</span></button>
          );
        })}
      </nav>
    </aside>
  );
}

const cardIcons = {
  deals: { color: "bg-[#e5edff] text-[#2869ff]", path: "m3 8 4-4 4 2 3-2 7 5-4 8-4 3-6-3-4-9Zm5 1 4-3 5 5-3 3-3-3-2 2M5 14l5 5M8 12l7 6" },
  value: { color: "bg-[#e5edff] text-[#2869ff]", path: "M12 2v20M17 6H9a4 4 0 0 0 0 8h6a3 3 0 0 1 0 6H6" },
  received: { color: "bg-[#d9f5e8] text-[#06a968]", path: "M9 12l2 2 4-4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" },
  pending: { color: "bg-[#fff0cc] text-[#bd790d]", path: "M12 6v6l4 3M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" },
};

function StatCard({ title, value, icon }: {
  title: string;
  value: string;
  icon: keyof typeof cardIcons;
}) {
  const { color, path } = cardIcons[icon];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#e5ebf5] bg-[#f9fbff] p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${color}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d={path} /></svg>
      </span>
      <div className="min-w-0 pt-1">
        <p className="text-sm font-medium text-[#405579]">{title}</p>
        <p className="mt-4 break-words text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1.5 text-xs text-[#53668e]">in selected period</p>
      </div>
    </div>
  );
}



function getDealStatus(deal: Pick<Deal, "contentCreated" | "posted" | "moneyReceived">) {
  if (deal.contentCreated && deal.posted) {
    return deal.moneyReceived ? "Completed" : "Pending Payment";
  }
  return deal.contentCreated || deal.posted ? "In Progress" : "Not Started";
}

function DealStatus({ deal }: { deal: Deal }) {
  const status = getDealStatus(deal);
  const colors = {
    Completed: "bg-[#d9f5e8] text-[#087a4d]",
    "Pending Payment": "bg-[#fff1d3] text-[#a36505]",
    "In Progress": "bg-[#e8efff] text-[#0655ff]",
    "Not Started": "bg-slate-100 text-slate-600",
  };
  return <span className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${colors[status]}`}>{status}</span>;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function DealEditor({ deal, onSave, onCancel }: {
  deal: Deal;
  onSave: (deal: Deal) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deliverables, setDeliverables] = useState<Deliverable[]>(() => (deal.deliverables ?? []).map(item => ({ ...item })));

  const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600";
  return (
    <form aria-label={`Edit ${deal.brand}`} onSubmit={async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const instagramUrl = String(form.get("instagramUrl") ?? "").trim();
      if (instagramUrl && !isInstagramUrl(instagramUrl)) {
        setError("Enter a valid Instagram link starting with https://www.instagram.com/ or leave it blank.");
        return;
      }
      if (!isDeliverables(deliverables)) {
        setError("Each deliverable needs a type and a whole-number quantity from 1 to 999.");
        return;
      }
      const updated = {
        ...deal,
        brand: String(form.get("brand") ?? "").trim(),
        instagramUrl: instagramUrl ? new URL(instagramUrl).href : null,
        deliverables,
        notes: String(form.get("notes") ?? "").trim(),
        category: String(form.get("category") ?? "").trim(),
        contactName: String(form.get("contactName") ?? "").trim(),
        contactEmail: String(form.get("contactEmail") ?? "").trim(),
        contactPhone: String(form.get("contactPhone") ?? "").trim(),
        amount: Number(form.get("amount")),
        dealDate: String(form.get("dealDate")),
        dueDate: String(form.get("dueDate")),
        contentCreated: form.has("contentCreated"),
        posted: form.has("posted"),
        moneyReceived: form.has("moneyReceived"),
      };
      if (updated.contactPhone && !/^\+[1-9]\d{6,14}$/.test(updated.contactPhone)) {
        setError("Enter the WhatsApp number with + and country code, without spaces (for example +491234567890)."); return;
      }
      if (!isDeal(updated)) { setError("Enter a brand name, a valid amount, and valid dates."); return; }
      const dateError = dealDateError(updated);
      if (dateError) { setError(dateError); return; }
      if (updated.posted && !updated.contentCreated) { setError("Mark content as created before marking it as posted."); return; }
      setSaving(true);
      try { setError(await onSave(updated) ?? ""); }
      catch { setError("Could not save. Please try again."); }
      finally { setSaving(false); }
    }}>
      <fieldset disabled={saving}>
      <h3 className="mb-3 font-semibold">{deal.brand ? "Edit deal & progress" : "Add brand deal"}</h3>
      <p className="mb-3 text-xs text-[#53668e]">Deal date must be today or earlier. Content due can be in the future.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs text-[#405579]">Brand<input autoFocus name="brand" required maxLength={120} defaultValue={deal.brand} className={inputClass} /></label>
        <label className="text-xs text-[#405579]">Amount (₹)<input name="amount" type="number" required min="0" step="0.01" defaultValue={deal.amount} className={inputClass} /></label>
        <label className="text-xs text-[#405579]">Deal date<input name="dealDate" type="date" required min="0001-01-01" max={todayDate()} defaultValue={deal.dealDate} className={inputClass} /></label>
        <label className="text-xs text-[#405579]">Content due<input name="dueDate" type="date" required min="0001-01-01" max="9999-12-31" defaultValue={deal.dueDate} className={inputClass} /></label>
      </div>
      <fieldset className="mt-4 grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-medium">Brand and contact details (optional)</legend>
        <label className="text-xs text-[#405579]">Category<input name="category" maxLength={120} defaultValue={deal.category ?? ""} placeholder="Lifestyle • Accessories" className={inputClass} /></label>
        <label className="text-xs text-[#405579]">Contact name<input name="contactName" maxLength={120} defaultValue={deal.contactName ?? ""} className={inputClass} /></label>
        <label className="text-xs text-[#405579]">Contact email<input name="contactEmail" type="email" maxLength={254} defaultValue={deal.contactEmail ?? ""} className={inputClass} /></label>
        <label className="text-xs text-[#405579]">WhatsApp number<input name="contactPhone" type="tel" maxLength={16} defaultValue={deal.contactPhone ?? ""} placeholder="+491234567890" className={inputClass} /><span className="mt-1 block">Include + and country code, without spaces.</span></label>
      </fieldset>
      <label className="mt-4 block text-xs text-[#405579]">
        Instagram link (optional)
        <input name="instagramUrl" type="url" maxLength={2048} defaultValue={deal.instagramUrl ?? ""} placeholder="https://www.instagram.com/brand/" className={inputClass} />
        <span className="mt-1 block text-[#53668e]">Makes the brand name clickable. Clear this field to remove the link.</span>
      </label>
      <fieldset className="mt-5">
        <legend className="mb-3 text-sm font-medium">Deliverables</legend>
        <p className="mb-3 text-xs text-[#53668e]">List the content agreed with this brand, for example 1 Reel and 3 Stories.</p>
        <div className="space-y-3">
          {deliverables.map((item, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-[#405579]">Type
                <select aria-label={`Deliverable ${index + 1} type`} value={item.type} onChange={(event) => setDeliverables(current => current.map((entry, i) => i === index ? { ...entry, type: event.target.value as Deliverable["type"] } : entry))} className={inputClass}>
                  {["Reel", "Story", "Post", "Ad Rights", "Other"].map(type => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="w-24 text-xs text-[#405579]">{item.type === "Ad Rights" ? "Months" : "Quantity"}
                <input aria-label={`Deliverable ${index + 1} ${item.type === "Ad Rights" ? "months" : "quantity"}`} type="number" required min="1" max="999" step="1" value={Number.isNaN(item.quantity) ? "" : item.quantity} onChange={(event) => setDeliverables(current => current.map((entry, i) => i === index ? { ...entry, quantity: event.target.valueAsNumber } : entry))} className={inputClass} />
              </label>
              <button type="button" aria-label={`Remove deliverable ${index + 1}`} onClick={() => setDeliverables(current => current.filter((_, i) => i !== index))} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50">Remove</button>
            </div>
          ))}
        </div>
        <button type="button" disabled={deliverables.length >= 50} onClick={() => setDeliverables(current => [...current, { type: "Reel", quantity: 1 }])} className="mt-3 cursor-pointer rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-600 disabled:opacity-50">+ Add deliverable</button>
      </fieldset>
      <label className="mt-4 block text-xs text-[#405579]">Notes (optional)
        <textarea name="notes" rows={3} maxLength={5000} defaultValue={deal.notes ?? ""} placeholder="Tag the brand, mention the discount code, or describe other deliverables…" className={inputClass} />
      </label>
      <fieldset className="mt-5">
        <legend className="mb-3 text-sm font-medium">Update progress</legend>
        <div className="flex flex-wrap gap-5">
          {([['contentCreated', 'Content created'], ['posted', 'Posted'], ['moneyReceived', 'Money received']] as const).map(([name, label]) => (
            <label key={name} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" name={name} defaultChecked={deal[name]} className="h-4 w-4 accent-blue-600" />{label}</label>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex items-center gap-3">
        <button type="submit" className="cursor-pointer rounded-lg bg-[#243657] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172846]">{saving ? "Saving…" : "Save changes"}</button>
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">Cancel</button>
        <p className="text-xs text-[#53668e]">Saved to Supabase.</p>
      </div>
      </fieldset>
    </form>
  );
}
