"use client";

import { useEffect, useState, type ReactNode } from "react";
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
        const response = await fetch("/api/invoices");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load invoices.");
        if (!body.invoices.every(isInvoice)) throw new Error("The saved invoices have an unexpected format.");
        if (active) { setInvoices(body.invoices); setLoaded(true); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load invoices. Check your connection and try again.");
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function save(invoice: Invoice) {
    try {
      const response = await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invoice) });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not save the invoice.";
      if (!isInvoice(body.invoice)) return "The database returned an unexpected result. Reload before retrying.";
      setInvoices(current => [...current.filter(entry => entry.id !== body.invoice.id), body.invoice]);
      return null;
    } catch { return "Could not save to the server. Check your connection and try again."; }
  }

  async function remove(id: string) {
    try {
      const response = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not delete the invoice.";
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
