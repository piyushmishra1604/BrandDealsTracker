"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Handshake, CircleDollarSign, Calendar, Tag } from "lucide-react";
import { type Campaign, type CampaignInput } from "@/lib/campaigns";
import { currencySymbols } from "@/lib/invoices";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { CampaignForm, type CampaignFormInput } from "./campaign-form";
import { CampaignCreatorsPanel } from "./campaign-creators-panel";

type Tab = "creatorsDeals" | "details" | "notes";
const tabs: { id: Tab; label: string }[] = [
  { id: "creatorsDeals", label: "Creators & Deals" },
  { id: "details", label: "Details" },
  { id: "notes", label: "Notes" },
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function StatCard({ icon: Icon, tint, label, value }: { icon: typeof Users; tint: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
      <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <div>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="text-xs text-[#53668e]">{label}</p>
      </div>
    </div>
  );
}

export function CampaignDetailClient({ campaign: initialCampaign }: { campaign: Campaign }) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [creatorCount, setCreatorCount] = useState(initialCampaign.creatorCount ?? 0);
  const [tab, setTab] = useState<Tab>("creatorsDeals");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [notesDraft, setNotesDraft] = useState(campaign.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const router = useRouter();

  async function patch(input: Partial<CampaignInput> & { imageUrl?: string | null; notes?: string | null }) {
    try {
      const response = await fetch(`/api/manager/campaigns/${campaign.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not save the campaign.";
      setCampaign(body.campaign);
      return null;
    } catch { return "Could not reach the server. Check your connection and try again."; }
  }

  async function save(input: CampaignFormInput) {
    const error = await patch(input);
    if (!error) { setEditing(false); setNotice("Campaign updated."); }
    return error;
  }

  async function saveNotes() {
    setSavingNotes(true);
    const error = await patch({ notes: notesDraft });
    setSavingNotes(false);
    if (error) { setNotice(error); return; }
    setEditingNotes(false);
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
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-[#53668e]">
        <Link href="/manager/campaigns" className="flex items-center gap-1.5 font-medium hover:text-[#101c40]">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Campaigns
        </Link>
        <span aria-hidden="true">/</span>
        <span className="truncate text-[#101c40]">{campaign.title}</span>
      </nav>

      {notice && <p role="status" className="mb-4 text-sm text-[#53668e]">{notice}</p>}

      {editing ? (
        <div className="mx-auto mb-8 max-w-2xl">
          <CampaignForm workspaceId={campaign.workspaceId} initial={campaign} onSave={save} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <div className="mb-8 flex flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(16,24,64,0.04)] sm:flex-row">
          {campaign.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
            <img src={campaign.imageUrl} alt="" className="h-32 w-32 shrink-0 rounded-xl object-cover" />
          ) : (
            <span aria-hidden="true" className="flex h-32 w-32 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 text-brand-300">
              <Handshake className="h-10 w-10" strokeWidth={1.5} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{campaign.title}</h1>
              <CampaignStatusBadge status={campaign.status} />
            </div>
            <p className="font-medium text-[#53668e]">{campaign.brand}</p>
            {campaign.description && <p className="mt-3 max-w-2xl text-sm text-[#53668e]">{campaign.description}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setEditing(true)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Edit Campaign</button>
              {campaign.status !== "archived" && (
                <button type="button" onClick={() => void archive()} disabled={archiving} className="cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
                  {archiving ? "Archiving…" : "Archive Campaign"}
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-row gap-3 sm:w-44 sm:flex-col">
            <div className="flex-1 rounded-xl border border-[#e5ebf5] bg-[#f7f9fd] p-3">
              <p className="flex items-center gap-1.5 text-xs text-[#53668e]"><Calendar className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />Start Date</p>
              <p className="mt-1 text-sm font-semibold">{formatDate(campaign.startDate)}</p>
            </div>
            <div className="flex-1 rounded-xl border border-[#e5ebf5] bg-[#f7f9fd] p-3">
              <p className="flex items-center gap-1.5 text-xs text-[#53668e]"><Calendar className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />End Date</p>
              <p className="mt-1 text-sm font-semibold">{formatDate(campaign.endDate)}</p>
            </div>
            {campaign.category && (
              <div className="flex-1 rounded-xl border border-[#e5ebf5] bg-[#f7f9fd] p-3">
                <p className="flex items-center gap-1.5 text-xs text-[#53668e]"><Tag className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />Category</p>
                <p className="mt-1 text-sm font-semibold">{campaign.category}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <section aria-label="Campaign metrics" className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} tint="bg-purple-50 text-purple-600" label="Creators" value={creatorCount.toString()} />
        {/* Deals and Total Deal Value don't exist until M5/M7 — honestly 0 until then. */}
        <StatCard icon={Handshake} tint="bg-emerald-50 text-emerald-600" label="Deals" value="0" />
        <StatCard icon={CircleDollarSign} tint="bg-amber-50 text-amber-600" label="Total Deal Value" value={`${currencySymbols[campaign.currency]}0`} />
      </section>

      <nav aria-label="Campaign sections" className="mb-7 flex gap-1 overflow-x-auto border-b border-[#edf1f8]">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={tab === id ? "page" : undefined}
            className={`shrink-0 cursor-pointer border-b-2 px-4 py-3 text-sm font-medium transition-colors hover:text-[#101c40] ${tab === id ? "border-brand-600 text-brand-600" : "border-transparent text-[#53668e]"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === "creatorsDeals" && (
        <CampaignCreatorsPanel campaignId={campaign.id} workspaceId={campaign.workspaceId} onCountChange={setCreatorCount} />
      )}

      {tab === "details" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
          <div className="border-b border-[#e5ebf5] px-5 py-5">
            <h2 className="text-lg font-bold">Details</h2>
          </div>
          <dl className="grid gap-5 p-5 sm:grid-cols-2">
            <div><dt className="text-xs text-[#53668e]">Brand</dt><dd className="mt-1 text-sm font-medium">{campaign.brand}</dd></div>
            <div><dt className="text-xs text-[#53668e]">Category</dt><dd className="mt-1 text-sm font-medium">{campaign.category || "—"}</dd></div>
            <div><dt className="text-xs text-[#53668e]">Budget</dt><dd className="mt-1 text-sm font-medium">{currencySymbols[campaign.currency]}{new Intl.NumberFormat("en-US").format(campaign.budget)}</dd></div>
            <div><dt className="text-xs text-[#53668e]">Status</dt><dd className="mt-1 text-sm font-medium"><CampaignStatusBadge status={campaign.status} /></dd></div>
            <div><dt className="text-xs text-[#53668e]">Start date</dt><dd className="mt-1 text-sm font-medium">{formatDate(campaign.startDate)}</dd></div>
            <div><dt className="text-xs text-[#53668e]">End date</dt><dd className="mt-1 text-sm font-medium">{formatDate(campaign.endDate)}</dd></div>
            {campaign.description && <div className="sm:col-span-2"><dt className="text-xs text-[#53668e]">Description</dt><dd className="mt-1 text-sm">{campaign.description}</dd></div>}
          </dl>
        </section>
      )}

      {tab === "notes" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
            <h2 className="text-lg font-bold">Campaign Notes</h2>
            {!editingNotes && <button type="button" onClick={() => { setNotesDraft(campaign.notes ?? ""); setEditingNotes(true); }} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Edit</button>}
          </div>
          <div className="p-5">
            {editingNotes ? (
              <div className="space-y-3">
                <textarea
                  rows={6}
                  maxLength={5000}
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  placeholder="Focus on lifestyle content with festive themes…"
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => void saveNotes()} disabled={savingNotes} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingNotes ? "Saving…" : "Save Notes"}</button>
                  <button type="button" onClick={() => setEditingNotes(false)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-[#53668e]">{campaign.notes || "No notes yet."}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
