"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { type Deal, isDeal, dealDateError } from "@/lib/deals";

const button = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";

export function CloudDashboard({ children }: {
  children: (deals: Deal[], save: (deal: Deal) => Promise<string | null>, remove: (id: string) => Promise<string | null>) => ReactNode;
}) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await getSupabase().from("deals").select("*").order("dealDate", { ascending: false });
        if (error) throw error;
        if (!data.every(isDeal)) throw new Error("The saved deals have an unexpected format.");
        if (active) { setDeals(data); setLoaded(true); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load deals. Check that the deals table has been created in Supabase.");
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function save(deal: Deal) {
    const dateError = dealDateError(deal);
    if (dateError) return dateError;
    try {
      const { data, error } = await getSupabase().from("deals").upsert(deal, { onConflict: "id" }).select().single();
      if (error) return error.message;
      if (!isDeal(data)) return "The database returned an unexpected result. Reload before retrying.";
      setDeals(current => [...current.filter(item => item.id !== data.id), data]);
      return null;
    } catch { return "Could not save to Supabase. Check your connection and try again."; }
  }

  async function remove(id: string) {
    try {
      const { data, error } = await getSupabase().from("deals").delete().eq("id", id).select("id");
      if (error) return error.code === "42501"
        ? "Delete access is not enabled yet. Run the shared-deal delete migration in Supabase, then try again."
        : error.message;
      if (!data || data.length !== 1 || data[0].id !== id) {
        return "Deletion was not confirmed. Refresh the page, or check that delete access is enabled in Supabase.";
      }
      setDeals(current => current.filter(deal => deal.id !== id));
      return null;
    } catch { return "Could not delete the deal. Check your connection and try again."; }
  }

  async function importDeals() {
    setBusy(true);
    setNotice("");
    try {
      const raw = localStorage.getItem("brandtracker-deals-v1");
      if (!raw) { setNotice("No browser-saved deals were found on this device."); return; }
      const saved: unknown = JSON.parse(raw);
      if (!Array.isArray(saved) || !saved.every(isDeal)) throw new Error("Browser-saved deals are invalid. The original data has been left untouched.");
      const invalidDate = saved.find(deal => dealDateError(deal));
      if (invalidDate) throw new Error(`${invalidDate.brand}: ${dealDateError(invalidDate)} Correct its dates before importing.`);
      // Insert missing IDs only. Repeating an import never overwrites newer cloud edits.
      const rows = saved;
      if (rows.length) {
        const { error } = await getSupabase().from("deals").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      setRetry(value => value + 1);
      setNotice("Import finished. Existing cloud deals were kept; your browser copy is unchanged.");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Import failed. Your browser copy is unchanged."); }
    finally { setBusy(false); }
  }

  return <>
    <div className="flex flex-wrap items-center justify-end gap-3 bg-[#f0f4f9] px-6 pt-3 text-sm">
      <span>BrandTracker</span>
      <button className={button} disabled={!loaded || busy} onClick={importDeals}>{busy ? "Importing…" : "Import browser deals"}</button>
    </div>
    {notice && <p role="status" className="bg-[#f0f4f9] px-6 py-3 text-sm">{notice}</p>}
    {error && <div role="alert" className="p-6 text-red-700">{error} <button className={button} onClick={() => setRetry(value => value + 1)}>Retry loading</button></div>}
    {loaded ? children(deals, save, remove) : !error && <p role="status" className="p-8">Loading your deals…</p>}
  </>;
}
