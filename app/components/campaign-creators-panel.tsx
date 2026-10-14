"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, ChevronRight, UserPlus, X, Pencil } from "lucide-react";
import { type Creator } from "@/lib/creators";
import { type CampaignCreatorEntry } from "@/lib/campaign-creators";
import { type AssignedDealInput, type Deal, type Deliverable, todayDate } from "@/lib/deals";
import { currencySymbols, type CurrencyCode } from "@/lib/invoices";
import type { DealOffer } from "@/lib/assigned-deal-store";
import {
  DEAL_PROGRESS_LABELS, canSetDeliveryStage, dealProgressOf, latestCounterAmount, type DealProgress, type DeliveryStage,
} from "@/lib/assigned-deals";
import { StatCard } from "./stat-card";

type DealProgressChoice = DealProgress;
const STATUS_CHOICES: DealProgressChoice[] = ["draft", "pending", "declined", "accepted", "content_created", "sent_to_brand", "posted", "settled"];
// Offer statuses are listed only when they are the current state or the next step (for example, Send to creator).
const OFFER_CHOICES: DealProgressChoice[] = ["draft", "pending", "declined"];

const offerEventLabels: Record<DealOffer["event"], string> = {
  offer: "sent an offer of",
  counter: "countered with",
  accept: "accepted",
  confirm: "confirmed",
  decline: "declined",
};

const deliverableLabels: Record<Deliverable["type"], string> = {
  Reel: "Instagram Reel",
  Story: "Instagram Stories",
  Post: "Instagram Post",
  "Ad Rights": "Ad rights",
  Other: "Other deliverable",
};

export const acceptanceLabels: Record<NonNullable<Deal["acceptanceStatus"]>, string> = {
  draft: "Created",
  pending: "Pending",
  countered: "Counter offer",
  accepted: "Accepted",
  confirmed: "Accepted",
  declined: "Declined",
  manual: "Manual",
};
export const acceptanceColors: Record<NonNullable<Deal["acceptanceStatus"]>, string> = {
  draft: "bg-sky-50 text-sky-700",
  pending: "bg-amber-50 text-amber-700",
  countered: "bg-violet-50 text-violet-700",
  accepted: "bg-emerald-50 text-emerald-700",
  confirmed: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-50 text-red-700",
  manual: "bg-slate-100 text-slate-700",
};

export function CampaignCreatorsPanel({ campaignId, workspaceId, currency, onCountChange, onDealsChange }: { campaignId: string; workspaceId: string; currency: CurrencyCode; onCountChange?: (count: number) => void; onDealsChange?: (count: number, totalValue: number) => void }) {
  const [entries, setEntries] = useState<CampaignCreatorEntry[]>([]);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newCreator, setNewCreator] = useState({ name: "", email: "", category: "" });

  const [editingDealFor, setEditingDealFor] = useState<string | null>(null);
  const [expandedCreatorId, setExpandedCreatorId] = useState<string | null>(null);
  const [dealAmount, setDealAmount] = useState("");
  const [dealDueDate, setDealDueDate] = useState("");
  const [dealNotes, setDealNotes] = useState("");
  const [dealDeliverables, setDealDeliverables] = useState<Deliverable[]>([]);
  const [newDeliverableType, setNewDeliverableType] = useState<Deliverable["type"]>("Reel");
  const [newDeliverableQuantity, setNewDeliverableQuantity] = useState(1);
  const [savingDeal, setSavingDeal] = useState(false);
  const [dealError, setDealError] = useState("");
  const [dealOfferNote, setDealOfferNote] = useState("");
  const [offersByCreator, setOffersByCreator] = useState<Record<string, DealOffer[]>>({});
  const [savingDeliverables, setSavingDeliverables] = useState(false);
  const [deliverableError, setDeliverableError] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [panelDeliverableType, setPanelDeliverableType] = useState<Deliverable["type"]>("Reel");
  const [panelDeliverableQuantity, setPanelDeliverableQuantity] = useState(1);
  const [draftDeliverableFor, setDraftDeliverableFor] = useState<string | null>(null);
  const [collapsedDeliverables, setCollapsedDeliverables] = useState<Set<string>>(new Set());
  const [deliverableMenuKey, setDeliverableMenuKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [entriesResponse, creatorsResponse] = await Promise.all([
          fetch(`/api/manager/campaigns/${campaignId}/creators`),
          fetch(`/api/manager/creators?workspaceId=${encodeURIComponent(workspaceId)}`),
        ]);
        const entriesBody = await entriesResponse.json();
        const creatorsBody = await creatorsResponse.json();
        if (!entriesResponse.ok) throw new Error(entriesBody.error ?? "Could not load campaign creators.");
        if (!creatorsResponse.ok) throw new Error(creatorsBody.error ?? "Could not load creators.");
        if (active) { setEntries(entriesBody.entries); setAllCreators(creatorsBody.creators); setLoaded(true); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load. Check your connection and try again.");
      }
    }
    void load();
    return () => { active = false; };
  }, [campaignId, workspaceId]);

  const availableCreators = allCreators.filter(creator => !creator.archivedAt && !entries.some(entry => entry.creatorId === creator.id));

  useEffect(() => { onCountChange?.(entries.length); }, [entries.length, onCountChange]);
  useEffect(() => {
    const dealsWithAmount = entries.map(entry => entry.deal).filter((deal): deal is NonNullable<typeof deal> => deal != null);
    onDealsChange?.(dealsWithAmount.length, dealsWithAmount.reduce((sum, deal) => sum + deal.amount, 0));
  }, [entries, onDealsChange]);

  async function addCreatorById(creatorId: string): Promise<boolean> {
    const response = await fetch(`/api/manager/campaigns/${campaignId}/creators`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creatorId }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error ?? "Could not add this creator."); return false; }
    setEntries(current => [...current, body.entry]);
    return true;
  }

  function closePicker() {
    setPicking(false);
    setCreatingNew(false);
    setSelectedId("");
    setNewCreator({ name: "", email: "", category: "" });
  }

  async function addCreator() {
    if (!selectedId) return;
    setAdding(true);
    setError("");
    try {
      if (await addCreatorById(selectedId)) closePicker();
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setAdding(false); }
  }

  // Creates the creator in the directory first, then adds them to this campaign.
  async function createAndAddCreator() {
    if (!newCreator.name.trim()) return;
    setAdding(true);
    setError("");
    try {
      const created = await fetch("/api/manager/creators", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, name: newCreator.name.trim(), email: newCreator.email.trim(), category: newCreator.category.trim() }),
      });
      const createdBody = await created.json();
      if (!created.ok) { setError(createdBody.error ?? "Could not add the creator."); return; }
      setAllCreators(current => [...current, createdBody.creator]);
      if (await addCreatorById(createdBody.creator.id)) closePicker();
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setAdding(false); }
  }

  async function removeCreator(creatorId: string) {
    if (!window.confirm("Remove this creator from the campaign?")) return;
    try {
      const response = await fetch(`/api/manager/campaigns/${campaignId}/creators/${creatorId}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Could not remove this creator."); return; }
      setEntries(current => current.filter(entry => entry.creatorId !== creatorId));
    } catch { setError("Could not reach the server. Check your connection and try again."); }
  }

  function startEditDeal(entry: CampaignCreatorEntry) {
    setEditingDealFor(entry.creatorId);
    setDealAmount(entry.deal ? String(entry.deal.amount) : "");
    setDealDueDate(entry.deal?.dueDate ?? todayDate());
    setDealNotes(entry.deal?.notes ?? "");
    setDealDeliverables((entry.deal?.deliverables ?? []).map(item => ({ ...item })));
    setNewDeliverableType("Reel");
    setNewDeliverableQuantity(1);
    setDealOfferNote("");
    setDealError("");
    if (entry.deal) void loadOffers(entry.creatorId);
  }

  async function loadOffers(creatorId: string) {
    try {
      const response = await fetch(`/api/manager/campaigns/${campaignId}/creators/${creatorId}/deals/negotiation`);
      const body = await response.json();
      if (!response.ok) { setDealError(body.error ?? "Could not load the offer history."); return; }
      setOffersByCreator(current => ({ ...current, [creatorId]: body.offers }));
    } catch { setDealError("Could not load the offer history. Check your connection and try again."); }
  }

  async function saveDeal(creatorId: string) {
    const amount = Number(dealAmount);
    if (!dealAmount || !Number.isFinite(amount) || amount < 0) { setDealError("Enter a valid amount."); return; }
    if (!dealDueDate) { setDealError("Choose a due date."); return; }
    setSavingDeal(true);
    setDealError("");
    try {
      const input: AssignedDealInput & { note?: string } = {
        amount, dueDate: dealDueDate, notes: dealNotes.trim() || undefined, deliverables: dealDeliverables, note: dealOfferNote.trim() || undefined,
      };
      const response = await fetch(`/api/manager/campaigns/${campaignId}/creators/${creatorId}/deals`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      const body = await response.json();
      if (!response.ok) { setDealError(body.error ?? "Could not save this deal."); return; }
      setEntries(current => current.map(entry => entry.creatorId === creatorId ? { ...entry, deal: body.deal } : entry));
      setEditingDealFor(null);
    } catch { setDealError("Could not reach the server. Check your connection and try again."); }
    finally { setSavingDeal(false); }
  }

  async function respondToDeal(creatorId: string, action: "confirm" | "decline") {
    setSavingDeal(true);
    setDealError("");
    try {
      const response = await fetch(`/api/manager/campaigns/${campaignId}/creators/${creatorId}/deals/negotiation`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: dealOfferNote.trim() || undefined }),
      });
      const body = await response.json();
      if (!response.ok) { setDealError(body.error ?? "Could not update this deal."); return; }
      setEntries(current => current.map(entry => entry.creatorId === creatorId ? { ...entry, deal: body.deal } : entry));
      setDealOfferNote("");
      setDealAmount(String(body.deal.amount));
      void loadOffers(creatorId);
    } catch { setDealError("Could not reach the server. Check your connection and try again."); }
    finally { setSavingDeal(false); }
  }

  function confirmDeal(creatorId: string) { return respondToDeal(creatorId, "confirm"); }

  function declineDeal(creatorId: string) { return respondToDeal(creatorId, "decline"); }

  async function saveDeliverables(entry: CampaignCreatorEntry, deliverables: Deliverable[]) {
    setSavingDeliverables(true);
    setDeliverableError("");
    try {
      const response = await fetch(`/api/manager/campaigns/${campaignId}/creators/${entry.creatorId}/deals`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deliverables }),
      });
      const body = await response.json();
      if (!response.ok) { setDeliverableError(body.error ?? "Could not update the deliverables."); return; }
      setEntries(current => current.map(item => item.creatorId === entry.creatorId ? { ...item, deal: body.deal } : item));
    } catch { setDeliverableError("Could not reach the server. Check your connection and try again."); }
    finally { setSavingDeliverables(false); }
  }

  // dealProgressOf reports a manual deal with no stage set as "accepted", which would mislabel it.
  function isManualAtStart(deal: Deal): boolean {
    return deal.acceptanceStatus === "manual" && dealProgressOf(deal) === "accepted";
  }

  // Created is set when the deal is made. Pending is set by sending a created deal, and Declined by the creator.
  function statusChoiceEnabled(deal: Deal, choice: DealProgressChoice): boolean {
    const current = dealProgressOf(deal);
    if (choice === current) return true;
    if (choice === "draft" || choice === "declined") return false;
    if (choice === "pending") return deal.acceptanceStatus === "draft";
    if (choice === "accepted") return deal.acceptanceStatus === "pending" || deal.acceptanceStatus === "countered" || (deal.acceptanceStatus === "confirmed" && current !== "accepted");
    return canSetDeliveryStage(deal.acceptanceStatus);
  }

  function changeStatus(entry: CampaignCreatorEntry, choice: DealProgressChoice) {
    if (!entry.deal || choice === "declined" || choice === "draft") return;
    if (choice === "pending") return sendDeal(entry);
    if (choice === "accepted") {
      if (entry.deal.acceptanceStatus === "confirmed") return saveStage(entry, "not_started");
      return confirmDeal(entry.creatorId);
    }
    return saveStage(entry, choice);
  }

  async function sendDeal(entry: CampaignCreatorEntry) {
    setSavingStatus(true);
    setStatusError("");
    try {
      const response = await fetch(`/api/manager/campaigns/${campaignId}/creators/${entry.creatorId}/deals`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send: true, note: dealOfferNote.trim() || undefined }),
      });
      const body = await response.json();
      if (!response.ok) { setStatusError(body.error ?? "Could not send this offer."); return; }
      setEntries(current => current.map(item => item.creatorId === entry.creatorId ? { ...item, deal: body.deal } : item));
      setDealOfferNote("");
      void loadOffers(entry.creatorId);
    } catch { setStatusError("Could not reach the server. Check your connection and try again."); }
    finally { setSavingStatus(false); }
  }

  async function saveStage(entry: CampaignCreatorEntry, stage: DeliveryStage) {
    setSavingStatus(true);
    setStatusError("");
    try {
      const response = await fetch(`/api/manager/campaigns/${campaignId}/creators/${entry.creatorId}/deals`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }),
      });
      const body = await response.json();
      if (!response.ok) { setStatusError(body.error ?? "Could not update the delivery stage."); return; }
      setEntries(current => current.map(item => item.creatorId === entry.creatorId ? { ...item, deal: body.deal } : item));
    } catch { setStatusError("Could not reach the server. Check your connection and try again."); }
    finally { setSavingStatus(false); }
  }

  function toggleDeliverable(entry: CampaignCreatorEntry, index: number) {
    if (!entry.deal?.deliverables) return;
    void saveDeliverables(entry, entry.deal.deliverables.map((item, i) => i === index ? { ...item, done: !item.done } : item));
  }

  function removePanelDeliverable(entry: CampaignCreatorEntry, index: number) {
    if (!entry.deal?.deliverables) return;
    void saveDeliverables(entry, entry.deal.deliverables.filter((_, i) => i !== index));
  }

  function addPanelDeliverable(entry: CampaignCreatorEntry) {
    const current = entry.deal?.deliverables ?? [];
    if (current.length >= 50) return;
    void saveDeliverables(entry, [...current, { type: panelDeliverableType, quantity: panelDeliverableQuantity }]);
    setPanelDeliverableQuantity(1);
  }

  async function removeDeal(creatorId: string) {
    if (!window.confirm("Remove this deal assignment?")) return;
    setSavingDeal(true);
    try {
      const response = await fetch(`/api/manager/campaigns/${campaignId}/creators/${creatorId}/deals`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) { setDealError(body.error ?? "Could not remove this deal."); return; }
      setEntries(current => current.map(entry => entry.creatorId === creatorId ? { ...entry, deal: null } : entry));
      setEditingDealFor(null);
    } catch { setDealError("Could not reach the server. Check your connection and try again."); }
    finally { setSavingDeal(false); }
  }

  const symbol = currencySymbols[currency] ?? "";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
        <h2 className="text-lg font-bold">Creators &amp; Deals</h2>
        {!picking && (
          <button type="button" onClick={() => setPicking(true)} className="flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            <UserPlus className="h-4 w-4" strokeWidth={2.4} /> Add Creator
          </button>
        )}
      </div>

      {picking && !creatingNew && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e5ebf5] bg-[#f7f9fd] px-5 py-4">
          <select aria-label="Choose a creator" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">Choose a creator…</option>
            {availableCreators.map((creator) => <option key={creator.id} value={creator.id}>{creator.name}</option>)}
          </select>
          <button type="button" onClick={() => void addCreator()} disabled={!selectedId || adding} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {adding ? "Adding…" : "Add"}
          </button>
          <button type="button" onClick={() => setCreatingNew(true)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">+ New creator</button>
          <button type="button" onClick={closePicker} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
          {availableCreators.length === 0 && <p className="text-sm text-[#53668e]">Every creator in your directory is already on this campaign.</p>}
        </div>
      )}

      {picking && creatingNew && (
        <form onSubmit={(event) => { event.preventDefault(); void createAndAddCreator(); }} className="flex flex-wrap items-end gap-2 border-b border-[#e5ebf5] bg-[#f7f9fd] px-5 py-4">
          <label className="text-xs text-[#405579]">Name
            <input type="text" required maxLength={120} value={newCreator.name} onChange={(event) => setNewCreator(current => ({ ...current, name: event.target.value }))} placeholder="Ankita Rath" className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-[#405579]">Email
            <input type="email" maxLength={254} value={newCreator.email} onChange={(event) => setNewCreator(current => ({ ...current, email: event.target.value }))} placeholder="Optional" className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-[#405579]">Category
            <input type="text" maxLength={120} value={newCreator.category} onChange={(event) => setNewCreator(current => ({ ...current, category: event.target.value }))} placeholder="Optional" className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={adding || !newCreator.name.trim()} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {adding ? "Adding…" : "Create and add"}
          </button>
          <button type="button" onClick={() => setCreatingNew(false)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Back to list</button>
        </form>
      )}

      {error && <p role="alert" className="px-5 py-3 text-sm text-red-700">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f5f7fb] text-xs text-[#405579]">
            <tr>
              {["Creator", "Deal Amount", "Deliverables", "Due Date", "Status"].map((label) => (
                <th key={label} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{label}</th>
              ))}
              <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loaded && entries.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[#53668e]">No creators on this campaign yet. Add one to get started.</td></tr>
            )}
            {entries.map((entry) => {
              return (
              <Fragment key={entry.id}>
                <tr onClick={() => {
                  const opening = expandedCreatorId !== entry.creatorId;
                  setExpandedCreatorId(opening ? entry.creatorId : null);
                  if (opening && entry.deal) void loadOffers(entry.creatorId);
                }} className="cursor-pointer border-t border-[#edf1f8] hover:bg-[#f8faff]">
                  <td className="whitespace-nowrap px-5 py-4 font-medium">
                    <button type="button" aria-label={`${expandedCreatorId === entry.creatorId ? "Hide" : "Show"} details for ${entry.creator?.name ?? "creator"}`} aria-expanded={expandedCreatorId === entry.creatorId} className="mr-2 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-500 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600">
                      {expandedCreatorId === entry.creatorId ? <ChevronDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" /> : <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
                    </button>
                    {entry.creator?.name ?? "—"}
                    {entry.creator?.instagramHandle && <span className="ml-1.5 font-normal text-[#53668e]">{entry.creator.instagramHandle}</span>}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">{entry.deal ? `${symbol}${entry.deal.amount.toLocaleString()}` : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">{entry.deal?.deliverables?.length ? `${entry.deal.deliverables.length} item${entry.deal.deliverables.length === 1 ? "" : "s"}` : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">{entry.deal ? new Date(`${entry.deal.dueDate}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {entry.deal?.acceptanceStatus ? (
                      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${acceptanceColors[entry.deal.acceptanceStatus]}`}>
                        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
                        {acceptanceLabels[entry.deal.acceptanceStatus]}
                      </span>
                    ) : <span className="text-[#53668e]">No deal yet</span>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4" onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => editingDealFor === entry.creatorId ? setEditingDealFor(null) : startEditDeal(entry)} aria-label={`${entry.deal ? "Edit" : "Assign"} deal for ${entry.creator?.name ?? "creator"}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#405579] hover:bg-brand-50 hover:text-brand-600">
                        <Pencil className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button type="button" onClick={() => void removeCreator(entry.creatorId)} aria-label={`Remove ${entry.creator?.name ?? "creator"}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#405579] hover:bg-red-50 hover:text-red-600">
                        <X className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
                {editingDealFor === entry.creatorId && (
                  <tr className="border-t border-[#edf1f8] bg-[#f7f9fd]">
                    <td colSpan={6} className="px-5 py-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1 text-xs font-medium text-[#405579]">
                          Amount ({symbol})
                          <input type="number" min="0" step="0.01" value={dealAmount} disabled={entry.deal?.acceptanceStatus === "accepted"} onChange={(event) => setDealAmount(event.target.value)} className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-500" />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-[#405579]">
                          Due Date
                          <input type="date" value={dealDueDate} onChange={(event) => setDealDueDate(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        </label>
                        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-[#405579]">
                          Notes (optional)
                          <input type="text" value={dealNotes} onChange={(event) => setDealNotes(event.target.value)} maxLength={5000} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        </label>
                        {entry.creator?.linkedUserId && (
                          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-[#405579]">
                            Message to creator (optional)
                            <input type="text" value={dealOfferNote} onChange={(event) => setDealOfferNote(event.target.value)} maxLength={500} placeholder="Sent with your next offer" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                          </label>
                        )}
                        <button type="button" onClick={() => void saveDeal(entry.creatorId)} disabled={savingDeal} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          {savingDeal ? "Saving…" : entry.deal?.acceptanceStatus === "countered" ? "Send counter-offer" : "Save Deal"}
                        </button>
                        {entry.deal?.acceptanceStatus === "draft" && entry.creator?.linkedUserId && (
                          <button type="button" onClick={() => void sendDeal(entry)} disabled={savingStatus} className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                            {savingStatus ? "Sending…" : "Send to creator"}
                          </button>
                        )}
                        {(entry.deal?.acceptanceStatus === "accepted" || entry.deal?.acceptanceStatus === "countered") && (
                          <button type="button" onClick={() => void confirmDeal(entry.creatorId)} disabled={savingDeal} className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                            {entry.deal.acceptanceStatus === "countered" ? "Accept counter-offer" : "Confirm amount"}
                          </button>
                        )}
                        {(entry.deal?.acceptanceStatus === "pending" || entry.deal?.acceptanceStatus === "countered") && (
                          <button type="button" onClick={() => void declineDeal(entry.creatorId)} disabled={savingDeal} className="cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                            Decline {entry.deal.acceptanceStatus === "countered" ? "counter-offer" : "offer"}
                          </button>
                        )}
                        <button type="button" onClick={() => setEditingDealFor(null)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
                        {entry.deal && (
                          <button type="button" onClick={() => void removeDeal(entry.creatorId)} disabled={savingDeal} className="cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Remove Deal</button>
                        )}
                      </div>
                      <div className="mt-4 border-t border-[#e5ebf5] pt-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#405579]">Deliverables</p>
                          {dealDeliverables.length > 0 && (
                            <ul className="mb-2 space-y-1">
                              {dealDeliverables.map((item, index) => (
                                <li key={index} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                                  <span>{deliverableLabels[item.type]}</span>
                                  <span className="font-semibold">{item.type === "Ad Rights" ? `${item.quantity} month${item.quantity === 1 ? "" : "s"}` : `${item.quantity} ×`}</span>
                                  <button type="button" aria-label={`Remove ${deliverableLabels[item.type]}`} onClick={() => setDealDeliverables(current => current.filter((_, i) => i !== index))} className="ml-auto cursor-pointer rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">Remove</button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="flex flex-wrap items-end gap-2">
                            <select aria-label="New deliverable type" value={newDeliverableType} onChange={(event) => setNewDeliverableType(event.target.value as Deliverable["type"])} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                              {(Object.keys(deliverableLabels) as Deliverable["type"][]).map(type => <option key={type} value={type}>{deliverableLabels[type]}</option>)}
                            </select>
                            <input aria-label="New deliverable quantity" type="number" min="1" max="999" step="1" value={Number.isNaN(newDeliverableQuantity) ? "" : newDeliverableQuantity} onChange={(event) => setNewDeliverableQuantity(event.target.valueAsNumber)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            <button type="button" disabled={dealDeliverables.length >= 50 || !Number.isInteger(newDeliverableQuantity) || newDeliverableQuantity < 1 || newDeliverableQuantity > 999} onClick={() => { setDealDeliverables(current => [...current, { type: newDeliverableType, quantity: newDeliverableQuantity }]); setNewDeliverableQuantity(1); }} className="cursor-pointer rounded-lg bg-[#243657] px-3 py-2 text-xs font-semibold text-white hover:bg-[#172846] disabled:opacity-50">+ Add deliverable</button>
                          </div>
                      </div>
                      <div className="mt-4 border-t border-[#e5ebf5] pt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#405579]">Offer history</p>
                        {!entry.deal ? (
                          <p className="mt-2 text-sm text-[#53668e]">Save a deal to start the negotiation.</p>
                        ) : (offersByCreator[entry.creatorId] ?? []).length === 0 ? (
                          <p className="mt-2 text-sm text-[#53668e]">No offers recorded yet.</p>
                        ) : (
                          <ol className="mt-2 space-y-2">
                            {(offersByCreator[entry.creatorId] ?? []).map((offer, index) => (
                              <li key={`${offer.created_at}-${index}`} className="text-sm">
                                <span className="font-medium">{offer.actor === "manager" ? "You" : entry.creator?.name ?? "Creator"}</span>{" "}
                                {offerEventLabels[offer.event]} {offer.event !== "accept" && offer.event !== "decline" && offer.event !== "confirm" ? `${symbol}${offer.amount.toLocaleString()}` : ""}
                                <span className="ml-2 text-xs text-[#53668e]">{new Date(offer.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                {offer.note && <p className="mt-0.5 text-[#405579]">&ldquo;{offer.note}&rdquo;</p>}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                      {dealError && <p role="alert" className="mt-2 text-sm text-red-700">{dealError}</p>}
                    </td>
                  </tr>
                )}
                {expandedCreatorId === entry.creatorId && editingDealFor !== entry.creatorId && (
                  <tr className="border-t border-[#edf1f8] bg-[#f8faff]">
                    <td colSpan={6} className="px-5 py-5">
                        {entry.deal && (entry.deal.acceptanceStatus === "countered" || entry.deal.acceptanceStatus === "pending" || entry.deal.acceptanceStatus === "accepted") && (
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e5ebf5] bg-white p-5">
                            <p className="text-sm text-[#405579]">
                              {entry.deal.acceptanceStatus === "countered" ? `${entry.creator?.name ?? "Creator"} countered at ${symbol}${(latestCounterAmount(offersByCreator[entry.creatorId] ?? []) ?? entry.deal.amount).toLocaleString()}. Accept it, decline, or send a different counter-offer.`
                                : entry.deal.acceptanceStatus === "accepted" ? `${entry.creator?.name ?? "Creator"} accepted ${symbol}${entry.deal.amount.toLocaleString()}. Confirm to lock it in.`
                                : `Waiting for ${entry.creator?.name ?? "the creator"} to respond to ${symbol}${entry.deal.amount.toLocaleString()}.`}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {(entry.deal.acceptanceStatus === "countered" || entry.deal.acceptanceStatus === "accepted") && (
                                <button type="button" onClick={() => void confirmDeal(entry.creatorId)} disabled={savingDeal} className="cursor-pointer rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                                  {entry.deal.acceptanceStatus === "countered" ? "Accept counter-offer" : "Confirm amount"}
                                </button>
                              )}
                              {(entry.deal.acceptanceStatus === "countered" || entry.deal.acceptanceStatus === "pending") && (
                                <button type="button" onClick={() => void declineDeal(entry.creatorId)} disabled={savingDeal} className="cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
                                  Decline {entry.deal.acceptanceStatus === "countered" ? "counter-offer" : "offer"}
                                </button>
                              )}
                              {entry.deal.acceptanceStatus === "countered" && (
                                <button type="button" onClick={() => startEditDeal(entry)} disabled={savingDeal} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                                  Send counter-offer
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-[#101c40]">{entry.creator?.name ?? "Creator"}&rsquo;s details</p>
                        <Link href={`/manager/creators/${entry.creatorId}`} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                          Open full page <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                        </Link>
                      </div>
                      {entry.deal && (
                        <section aria-label={`Deal for ${entry.creator?.name ?? "creator"} on this campaign`} className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <StatCard title="Amount" value={`${symbol}${entry.deal.amount.toLocaleString()}`} />
                          <StatCard title="Due date" value={new Date(`${entry.deal.dueDate}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })} />
                          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
                            <label htmlFor={`status-${entry.creatorId}`} className="text-xs font-medium uppercase tracking-wide text-[#53668e]">Status</label>
                            <select
                              id={`status-${entry.creatorId}`}
                              value={isManualAtStart(entry.deal) ? "manual" : dealProgressOf(entry.deal)}
                              disabled={savingStatus || savingDeal}
                              onChange={event => void changeStatus(entry, event.target.value as DealProgressChoice)}
                              className="mt-2 w-full cursor-pointer rounded-lg border border-[#d4ddec] bg-white px-2 py-1.5 text-lg font-bold text-[#101c40] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {/* Manual deals were agreed off-platform, so no offer status applies until a stage is set. */}
                              {isManualAtStart(entry.deal) && <option value="manual" disabled>Manual</option>}
                              {STATUS_CHOICES.filter(choice => !OFFER_CHOICES.includes(choice) || statusChoiceEnabled(entry.deal!, choice)).map(choice => {
                                const enabled = statusChoiceEnabled(entry.deal!, choice);
                                return (
                                  <option key={choice} value={choice} disabled={!enabled}>
                                    {choice === "pending" && entry.deal!.acceptanceStatus === "draft" ? "Send to creator" : DEAL_PROGRESS_LABELS[choice]}{!enabled && choice !== dealProgressOf(entry.deal!) ? " (not available)" : ""}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                        </section>
                      )}
                      {statusError && <p role="alert" className="mb-4 text-sm text-red-600">{statusError}</p>}
                      {entry.deal?.notes && (
                        <div className="mb-6 rounded-xl border border-[#e5ebf5] bg-white p-5"><p className="text-xs text-[#53668e]">Deal notes</p><p className="mt-1 whitespace-pre-wrap text-sm">{entry.deal.notes}</p></div>
                      )}
                      <dl className="mb-6 grid gap-4 rounded-xl border border-[#e5ebf5] bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div><dt className="text-xs text-[#53668e]">Category</dt><dd className="mt-1 text-sm font-medium">{entry.creator?.category || "—"}</dd></div>
                        <div><dt className="text-xs text-[#53668e]">Email</dt><dd className="mt-1 text-sm font-medium">{entry.creator?.email || "—"}</dd></div>
                        <div><dt className="text-xs text-[#53668e]">Phone</dt><dd className="mt-1 text-sm font-medium">{entry.creator?.phone || "—"}</dd></div>
                        <div><dt className="text-xs text-[#53668e]">Instagram</dt><dd className="mt-1 text-sm font-medium">{entry.creator?.instagramHandle || "—"}</dd></div>
                        {entry.creator?.notes && (
                          <div className="sm:col-span-2 lg:col-span-4"><dt className="text-xs text-[#53668e]">Notes</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{entry.creator.notes}</dd></div>
                        )}
                      </dl>
                      {entry.deal ? (
                        <>
                        <div className="mt-4 rounded-xl border border-[#e5ebf5] bg-white p-5">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <button type="button" aria-expanded={!collapsedDeliverables.has(entry.creatorId)} onClick={() => setCollapsedDeliverables(current => { const next = new Set(current); if (next.has(entry.creatorId)) next.delete(entry.creatorId); else next.add(entry.creatorId); return next; })} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#101c40]">
                              <span className={`inline-block transition-transform ${collapsedDeliverables.has(entry.creatorId) ? "-rotate-90" : ""}`}>▾</span>
                              Deliverables
                              <span className="text-xs font-normal text-[#53668e]">{entry.deal.deliverables?.length ?? 0} item{(entry.deal.deliverables?.length ?? 0) === 1 ? "" : "s"}</span>
                            </button>
                            <button type="button" disabled={savingDeliverables || draftDeliverableFor === entry.creatorId || (entry.deal.deliverables?.length ?? 0) >= 50} onClick={() => { setDraftDeliverableFor(entry.creatorId); setPanelDeliverableQuantity(1); setCollapsedDeliverables(current => { const next = new Set(current); next.delete(entry.creatorId); return next; }); }} className="cursor-pointer rounded-lg bg-[#243657] px-3 py-2 text-xs font-semibold text-white hover:bg-[#172846] disabled:opacity-50">+ Add deliverable</button>
                          </div>
                          {deliverableError && <p role="alert" className="mb-3 text-sm text-red-700">{deliverableError}</p>}
                          {!collapsedDeliverables.has(entry.creatorId) && (entry.deal.deliverables?.length || draftDeliverableFor === entry.creatorId ? (
                            <ul className="space-y-2">
                              {(entry.deal.deliverables ?? []).map((item, index) => {
                                const menuKey = `${entry.creatorId}:${index}`;
                                const itemName = deliverableLabels[item.type];
                                return (
                                  <li key={index} className={`flex items-center gap-3 rounded-lg px-3 py-3 ${index % 2 ? "bg-[#f0f5ff]" : "bg-[#fcf0fa]"}`}>
                                    <input
                                      type="checkbox"
                                      aria-label={`Mark ${itemName} for ${entry.creator?.name ?? "creator"} as done`}
                                      checked={!!item.done}
                                      disabled={savingDeliverables}
                                      onChange={() => toggleDeliverable(entry, index)}
                                      className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
                                    />
                                    <span className={`text-sm ${item.done ? "text-[#53668e] line-through" : ""}`}>{itemName}</span>
                                    <span className="ml-auto whitespace-nowrap text-sm font-semibold">{item.type === "Ad Rights" ? `${item.quantity} month${item.quantity === 1 ? "" : "s"}` : `${item.quantity} ×`}</span>
                                    <div className="relative">
                                      <button type="button" aria-label={`More options for ${itemName}`} aria-haspopup="menu" aria-expanded={deliverableMenuKey === menuKey} onClick={() => setDeliverableMenuKey(current => current === menuKey ? null : menuKey)} className="cursor-pointer rounded px-2 py-1 text-base leading-none text-[#53668e] hover:bg-white">⋮</button>
                                      {deliverableMenuKey === menuKey && (
                                        <div role="menu" className="absolute right-0 z-10 mt-1 w-28 rounded-lg border border-slate-200 bg-white py-1 shadow-md">
                                          <button type="button" role="menuitem" disabled={savingDeliverables} onClick={() => { setDeliverableMenuKey(null); removePanelDeliverable(entry, index); }} className="w-full cursor-pointer px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">Remove</button>
                                        </div>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                              {draftDeliverableFor === entry.creatorId && (
                                <li className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[#243657]/40 px-3 py-3">
                                  <select aria-label={`New deliverable type for ${entry.creator?.name ?? "creator"}`} value={panelDeliverableType} onChange={(event) => setPanelDeliverableType(event.target.value as Deliverable["type"])} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                                    {(Object.keys(deliverableLabels) as Deliverable["type"][]).map(type => <option key={type} value={type}>{deliverableLabels[type]}</option>)}
                                  </select>
                                  <input aria-label={`New deliverable quantity for ${entry.creator?.name ?? "creator"}`} type="number" min="1" max="999" step="1" value={Number.isNaN(panelDeliverableQuantity) ? "" : panelDeliverableQuantity} onChange={(event) => setPanelDeliverableQuantity(event.target.valueAsNumber)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                                  <div className="ml-auto flex gap-2">
                                    <button type="button" onClick={() => setDraftDeliverableFor(null)} className="cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-[#53668e] hover:bg-slate-100">Cancel</button>
                                    <button type="button" disabled={savingDeliverables || !Number.isInteger(panelDeliverableQuantity) || panelDeliverableQuantity < 1 || panelDeliverableQuantity > 999} onClick={() => { addPanelDeliverable(entry); setDraftDeliverableFor(null); }} className="cursor-pointer rounded-lg bg-[#243657] px-3 py-2 text-xs font-semibold text-white hover:bg-[#172846] disabled:opacity-50">{savingDeliverables ? "Saving…" : "Add"}</button>
                                  </div>
                                </li>
                              )}
                            </ul>
                          ) : <p className="text-sm text-[#53668e]">No deliverables assigned yet.</p>)}
                        </div>
                        </>
                      ) : (
                        <p className="rounded-xl border border-dashed border-[#c9d4e8] bg-white p-5 text-sm text-[#53668e]">No deal assigned yet. Use the pencil icon on the row to assign one.</p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
