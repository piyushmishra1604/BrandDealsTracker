"use client";

import { useEffect, useState, type ReactNode } from "react";
import { type Deal, isDeal, dealDateError } from "@/lib/deals";

const button = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";

export function CloudDashboard({ children }: {
  children: (deals: Deal[], save: (deal: Deal) => Promise<string | null>, remove: (id: string) => Promise<string | null>) => ReactNode;
}) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/deals");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load deals.");
        if (!body.deals.every(isDeal)) throw new Error("The saved deals have an unexpected format.");
        if (active) { setDeals(body.deals); setLoaded(true); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load deals. Check your connection and try again.");
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function save(deal: Deal) {
    const dateError = dealDateError(deal);
    if (dateError) return dateError;
    try {
      const response = await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(deal) });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not save the deal.";
      if (!isDeal(body.deal)) return "The database returned an unexpected result. Reload before retrying.";
      setDeals(current => [...current.filter(item => item.id !== body.deal.id), body.deal]);
      return null;
    } catch { return "Could not save to the server. Check your connection and try again."; }
  }

  async function remove(id: string) {
    try {
      const response = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not delete the deal.";
      setDeals(current => current.filter(deal => deal.id !== id));
      return null;
    } catch { return "Could not delete the deal. Check your connection and try again."; }
  }

  return <>
    {error && <div role="alert" className="p-6 text-red-700">{error} <button className={button} onClick={() => setRetry(value => value + 1)}>Retry loading</button></div>}
    {loaded ? children(deals, save, remove) : !error && <p role="status" className="p-8">Loading your deals…</p>}
  </>;
}
