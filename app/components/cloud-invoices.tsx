"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { type Invoice, isInvoice } from "@/lib/invoices";

export function CloudInvoices({ children }: {
  children: (invoices: Invoice[], save: (invoice: Invoice) => Promise<string | null>, remove: (id: string) => Promise<string | null>) => ReactNode;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await getSupabase().from("invoices").select("*").order("issueDate", { ascending: false });
        if (error) throw error;
        if (!data.every(isInvoice)) throw new Error("The saved invoices have an unexpected format.");
        if (active) { setInvoices(data); setLoaded(true); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load invoices. Check that the invoices table has been created in Supabase.");
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function save(invoice: Invoice) {
    try {
      const { data, error } = await getSupabase().from("invoices").upsert(invoice, { onConflict: "id" }).select().single();
      if (error) return error.message;
      if (!isInvoice(data)) return "The database returned an unexpected result. Reload before retrying.";
      setInvoices(current => [...current.filter(entry => entry.id !== data.id), data]);
      return null;
    } catch { return "Could not save to Supabase. Check your connection and try again."; }
  }

  async function remove(id: string) {
    try {
      const { data, error } = await getSupabase().from("invoices").delete().eq("id", id).select("id");
      if (error) return error.message;
      if (!data || data.length !== 1 || data[0].id !== id) {
        return "Deletion was not confirmed. Refresh the page and try again.";
      }
      setInvoices(current => current.filter(invoice => invoice.id !== id));
      return null;
    } catch { return "Could not delete the invoice. Check your connection and try again."; }
  }

  const button = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";
  return <>
    {error && <div role="alert" className="p-6 text-red-700">{error} <button className={button} onClick={() => setRetry(value => value + 1)}>Retry loading</button></div>}
    {loaded ? children(invoices, save, remove) : !error && <p role="status" className="p-8">Loading your invoices…</p>}
  </>;
}
