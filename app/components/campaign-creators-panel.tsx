"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { type Creator } from "@/lib/creators";
import { type CampaignCreatorEntry } from "@/lib/campaign-creators";

export function CampaignCreatorsPanel({ campaignId, workspaceId, onCountChange }: { campaignId: string; workspaceId: string; onCountChange?: (count: number) => void }) {
  const [entries, setEntries] = useState<CampaignCreatorEntry[]>([]);
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [adding, setAdding] = useState(false);

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
              <th scope="col" className="px-3 py-3"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {loaded && entries.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-[#53668e]">No creators on this campaign yet. Add one to get started.</td></tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-[#edf1f8]">
                <td className="whitespace-nowrap px-5 py-4 font-medium">
                  {entry.creator?.name ?? "—"}
                  {entry.creator?.instagramHandle && <span className="ml-1.5 font-normal text-[#53668e]">{entry.creator.instagramHandle}</span>}
                </td>
                {/* Deal assignment doesn't exist until M5 — these stay placeholders until then. */}
                <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">—</td>
                <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">—</td>
                <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">—</td>
                <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">No deal yet</td>
                <td className="whitespace-nowrap px-3 py-4">
                  <button type="button" onClick={() => void removeCreator(entry.creatorId)} aria-label={`Remove ${entry.creator?.name ?? "creator"}`} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#405579] hover:bg-red-50 hover:text-red-600">
                    <X className="h-4 w-4" strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
