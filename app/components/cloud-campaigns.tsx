"use client";

import { useEffect, useState, type ReactNode } from "react";
import { type Campaign, type CampaignInput } from "@/lib/campaigns";

export function CloudCampaigns({ workspaceId, children }: {
  workspaceId: string;
  children: (
    campaigns: Campaign[],
    save: (input: CampaignInput, id?: string) => Promise<string | null>,
  ) => ReactNode;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/manager/campaigns?workspaceId=${encodeURIComponent(workspaceId)}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load campaigns.");
        if (active) { setCampaigns(body.campaigns); setLoaded(true); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load campaigns. Check your connection and try again.");
      }
    }
    void load();
    return () => { active = false; };
  }, [workspaceId, retry]);

  async function save(input: CampaignInput, id?: string) {
    try {
      const response = id
        ? await fetch(`/api/manager/campaigns/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
        : await fetch("/api/manager/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, ...input }) });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not save the campaign.";
      setCampaigns(current => {
        const withoutSaved = current.filter(entry => entry.id !== body.campaign.id);
        // Archived campaigns drop out of the active list, same as the list API's own filter.
        return body.campaign.status === "archived" ? withoutSaved : [body.campaign, ...withoutSaved];
      });
      return null;
    } catch { return "Could not save to the server. Check your connection and try again."; }
  }

  const button = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";
  return <>
    {error && <div role="alert" className="p-6 text-red-700">{error} <button className={button} onClick={() => setRetry(value => value + 1)}>Retry loading</button></div>}
    {loaded ? children(campaigns, save) : !error && <p role="status" className="p-8">Loading campaigns…</p>}
  </>;
}
