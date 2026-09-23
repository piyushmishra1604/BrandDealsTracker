"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { type Outreach, isOutreach } from "@/lib/outreach";

export function CloudOutreach({ children }: {
  children: (outreach: Outreach[], save: (item: Outreach) => Promise<string | null>, remove: (id: string) => Promise<string | null>) => ReactNode;
}) {
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await getSupabase().from("outreach").select("*").order("dateReachedOut", { ascending: false });
        if (error) throw error;
        if (!data.every(isOutreach)) throw new Error("The saved outreach records have an unexpected format.");
        if (active) { setOutreach(data); setLoaded(true); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load brand outreach. Check that the outreach table has been created in Supabase.");
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function save(item: Outreach) {
    try {
      const { data, error } = await getSupabase().from("outreach").upsert(item, { onConflict: "id" }).select().single();
      if (error) return error.message;
      if (!isOutreach(data)) return "The database returned an unexpected result. Reload before retrying.";
      setOutreach(current => [...current.filter(entry => entry.id !== data.id), data]);
      return null;
    } catch { return "Could not save to Supabase. Check your connection and try again."; }
  }

  async function remove(id: string) {
    try {
      const { data, error } = await getSupabase().from("outreach").delete().eq("id", id).select("id");
      if (error) return error.message;
      if (!data || data.length !== 1 || data[0].id !== id) {
        return "Deletion was not confirmed. Refresh the page and try again.";
      }
      setOutreach(current => current.filter(item => item.id !== id));
      return null;
    } catch { return "Could not delete the record. Check your connection and try again."; }
  }

  const button = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";
  return <>
    {error && <div role="alert" className="p-6 text-red-700">{error} <button className={button} onClick={() => setRetry(value => value + 1)}>Retry loading</button></div>}
    {loaded ? children(outreach, save, remove) : !error && <p role="status" className="p-8">Loading your brand outreach…</p>}
  </>;
}
