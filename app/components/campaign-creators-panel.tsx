"use client";

import { Fragment, useEffect, useState } from "react";
import { UserPlus, X, Pencil } from "lucide-react";
import { type Creator } from "@/lib/creators";
import { type CampaignCreatorEntry } from "@/lib/campaign-creators";
import { type AssignedDealInput, type Deal, todayDate } from "@/lib/deals";
import { currencySymbols, type CurrencyCode } from "@/lib/invoices";

const acceptanceLabels: Record<NonNullable<Deal["acceptanceStatus"]>, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
};
const acceptanceColors: Record<NonNullable<Deal["acceptanceStatus"]>, string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-700",
};

export function CampaignCreatorsPanel({ campaignId, workspaceId, currency, onCountChange, onDealsChange }: { campaignId: string; workspaceId: string; currency: CurrencyCode; onCountChange?: (count: number) => void; onDealsChange?: (count: number, totalValue: number) => void }) {
  const [entries, setEntries] = useState<CampaignCreatorEntry[]>([]);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingDealFor, setEditingDealFor] = useState<string | null>(null);
  const [dealAmount, setDealAmount] = useState("");
  const [dealDueDate, setDealDueDate] = useState("");
  const [dealNotes, setDealNotes] = useState("");
  const [savingDeal, setSavingDeal] = useState(false);
  const [dealError, setDealError] = useState("");

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

  const availableCreators = allCreators.filter(creator => !entries.some(entry => entry.creatorId === creator.id));

  useEffect(() => { onCountChange?.(entries.length); }, [entries.length, onCountChange]);
  useEffect(() => {
    const dealsWithAmount = entries.map(entry => entry.deal).filter((deal): deal is NonNullable<typeof deal> => deal != null);
    onDealsChange?.(dealsWithAmount.length, dealsWithAmount.reduce((sum, deal) => sum + deal.amount, 0));
  }, [entries, onDealsChange]);

  async function addCreator() {
    if (!selectedId) return;
    setAdding(true);
    setError("");
    try {
      const response = await fetch(`/api/manager/campaigns/${campaignId}/creators`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creatorId: selectedId }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Could not add this creator."); return; }
      setEntries(current => [...current, body.entry]);
      setSelectedId("");
      setPicking(false);
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
    setDealError("");
  }

  async function saveDeal(creatorId: string) {
    const amount = Number(dealAmount);
    if (!dealAmount || !Number.isFinite(amount) || amount < 0) { setDealError("Enter a valid amount."); return; }
    if (!dealDueDate) { setDealError("Choose a due date."); return; }
    setSavingDeal(true);
    setDealError("");
    try {
      const input: AssignedDealInput = { amount, dueDate: dealDueDate, notes: dealNotes.trim() || undefined };
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

      {picking && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e5ebf5] bg-[#f7f9fd] px-5 py-4">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <option value="">Choose a creator…</option>
            {availableCreators.map((creator) => <option key={creator.id} value={creator.id}>{creator.name}</option>)}
          </select>
          <button type="button" onClick={() => void addCreator()} disabled={!selectedId || adding} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {adding ? "Adding…" : "Add"}
          </button>
          <button type="button" onClick={() => { setPicking(false); setSelectedId(""); }} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
          {availableCreators.length === 0 && <p className="text-sm text-[#53668e]">Every creator in your directory is already on this campaign.</p>}
        </div>
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
            {entries.map((entry) => (
              <Fragment key={entry.id}>
                <tr className="border-t border-[#edf1f8]">
                  <td className="whitespace-nowrap px-5 py-4 font-medium">
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
                  <td className="whitespace-nowrap px-3 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {entry.creator?.linkedUserId ? (
                        <button type="button" onClick={() => editingDealFor === entry.creatorId ? setEditingDealFor(null) : startEditDeal(entry)} aria-label={`${entry.deal ? "Edit" : "Assign"} deal for ${entry.creator?.name ?? "creator"}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#405579] hover:bg-brand-50 hover:text-brand-600">
                          <Pencil className="h-4 w-4" strokeWidth={2} />
                        </button>
                      ) : (
                        <span className="text-xs text-[#53668e]" title="Link this creator to their account before assigning a deal">Link required</span>
                      )}
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
                          <input type="number" min="0" step="0.01" value={dealAmount} onChange={(event) => setDealAmount(event.target.value)} className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        </label>
                        <label className="flex flex-col gap-1 text-xs font-medium text-[#405579]">
                          Due Date
                          <input type="date" value={dealDueDate} onChange={(event) => setDealDueDate(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        </label>
                        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-[#405579]">
                          Notes (optional)
                          <input type="text" value={dealNotes} onChange={(event) => setDealNotes(event.target.value)} maxLength={5000} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                        </label>
                        <button type="button" onClick={() => void saveDeal(entry.creatorId)} disabled={savingDeal} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                          {savingDeal ? "Saving…" : "Save Deal"}
                        </button>
                        <button type="button" onClick={() => setEditingDealFor(null)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Cancel</button>
                        {entry.deal && (
                          <button type="button" onClick={() => void removeDeal(entry.creatorId)} disabled={savingDeal} className="cursor-pointer rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Remove Deal</button>
                        )}
                      </div>
                      {dealError && <p role="alert" className="mt-2 text-sm text-red-700">{dealError}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
