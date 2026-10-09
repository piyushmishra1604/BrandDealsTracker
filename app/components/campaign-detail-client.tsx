"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Handshake, FileText, CreditCard } from "lucide-react";
import { type Campaign, type CampaignInput } from "@/lib/campaigns";
import { currencySymbols } from "@/lib/invoices";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { CampaignForm } from "./campaign-form";

type Tab = "overview" | "creators" | "deals" | "content" | "payments";
const tabs: { id: Tab; label: string; icon: typeof Users; comingIn: string }[] = [
  { id: "overview", label: "Overview", icon: ArrowLeft, comingIn: "" },
  { id: "creators", label: "Creators", icon: Users, comingIn: "M4 (Creator directory)" },
  { id: "deals", label: "Deals", icon: Handshake, comingIn: "M5 (Deal assignment)" },
  { id: "content", label: "Content", icon: FileText, comingIn: "M7 (Deliverables)" },
  { id: "payments", label: "Payments", icon: CreditCard, comingIn: "M7 (Payments)" },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function CampaignDetailClient({ campaign: initialCampaign }: { campaign: Campaign }) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [archiving, setArchiving] = useState(false);
  const router = useRouter();

  async function patch(input: Partial<CampaignInput>) {
    try {
      const response = await fetch(`/api/manager/campaigns/${campaign.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not save the campaign.";
      setCampaign(body.campaign);
      return null;
    } catch { return "Could not reach the server. Check your connection and try again."; }
  }

  async function save(input: CampaignInput) {
    const error = await patch(input);
    if (!error) { setEditing(false); setNotice("Campaign updated."); }
    return error;
  }

  async function archive() {
    if (archiving || !window.confirm(`Archive the "${campaign.title}" campaign? It will no longer appear in your active campaign list.`)) return;
    setArchiving(true);
    const error = await patch({ status: "archived" });
    setArchiving(false);
    if (error) { setNotice(error); return; }
    router.push("/manager/campaigns");
  }

  return (
    <div>
      <Link href="/manager/campaigns" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#53668e] hover:text-[#101c40]">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to Campaigns
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{campaign.title}</h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
          <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">{campaign.brand}</p>
        </div>
        {campaign.status !== "archived" && (
          <button type="button" onClick={() => void archive()} disabled={archiving} className="cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
            {archiving ? "Archiving…" : "Archive Campaign"}
          </button>
        )}
      </div>

      {notice && <p role="status" className="mb-4 text-sm text-[#53668e]">{notice}</p>}

      <nav aria-label="Campaign sections" className="mb-7 flex gap-1 overflow-x-auto border-b border-[#edf1f8]">
        {tabs.map(({ id, label, comingIn }) => (
          <button
            key={id}
            type="button"
            onClick={() => comingIn ? undefined : setTab(id)}
            disabled={!!comingIn}
            title={comingIn ? `Coming in ${comingIn}` : undefined}
            aria-current={tab === id ? "page" : undefined}
            className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${tab === id ? "border-brand-600 text-brand-600" : "border-transparent text-[#53668e]"} ${comingIn ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:text-[#101c40]"}`}
          >
            {label}{comingIn && <span className="sr-only"> (coming soon)</span>}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        editing ? (
          <div className="mx-auto max-w-2xl">
            <CampaignForm initial={campaign} onSave={save} onCancel={() => setEditing(false)} />
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
              <h2 className="text-lg font-bold">Overview</h2>
              <button type="button" onClick={() => setEditing(true)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Edit</button>
            </div>
            <dl className="grid gap-5 p-5 sm:grid-cols-2">
              <div><dt className="text-xs text-[#53668e]">Brand</dt><dd className="mt-1 text-sm font-medium">{campaign.brand}</dd></div>
              <div><dt className="text-xs text-[#53668e]">Budget</dt><dd className="mt-1 text-sm font-medium">{currencySymbols[campaign.currency]}{new Intl.NumberFormat("en-US").format(campaign.budget)}</dd></div>
              <div><dt className="text-xs text-[#53668e]">Start date</dt><dd className="mt-1 text-sm font-medium">{formatDate(campaign.startDate)}</dd></div>
              <div><dt className="text-xs text-[#53668e]">End date</dt><dd className="mt-1 text-sm font-medium">{formatDate(campaign.endDate)}</dd></div>
            </dl>
          </section>
        )
      )}

      {tab !== "overview" && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d7e0f0] bg-[#f7f9fd] px-6 py-16 text-center">
          <p className="text-base font-semibold text-[#101c40]">{tabs.find(t => t.id === tab)?.label} is coming soon</p>
          <p className="max-w-sm text-sm text-[#53668e]">This section arrives in {tabs.find(t => t.id === tab)?.comingIn}.</p>
        </div>
      )}
    </div>
  );
}
