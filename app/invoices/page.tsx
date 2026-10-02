"use client";

import Link from "next/link";
import { useState } from "react";
import { type Invoice, invoiceTotal, currencySymbols } from "@/lib/invoices";
import { CloudInvoices } from "../components/cloud-invoices";
import { Sidebar } from "../components/sidebar";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatAmount(amount: number, currency: Invoice["currency"]) {
  return `${currencySymbols[currency]}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

export default function InvoicesPage() {
  return <CloudInvoices>{(invoices, _save, removeInvoice) => (
    <InvoiceList invoices={invoices} removeInvoice={removeInvoice} />
  )}</CloudInvoices>;
}

function InvoiceList({ invoices, removeInvoice }: { invoices: Invoice[]; removeInvoice: (id: string) => Promise<string | null> }) {
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function deleteInvoice(invoice: Invoice) {
    if (deletingId || !window.confirm(`Delete invoice ${invoice.invoiceNumber} for ${invoice.brand}? This permanently removes it and cannot be undone.`)) return;
    setDeletingId(invoice.id);
    setNotice("");
    try {
      const error = await removeInvoice(invoice.id);
      setNotice(error ?? `${invoice.invoiceNumber} deleted.`);
    } catch { setNotice("Could not delete the invoice. Please try again."); }
    finally { setDeletingId(null); }
  }

  const searchLower = search.trim().toLowerCase();
  const filteredInvoices = invoices.filter(invoice =>
    !searchLower || invoice.brand.toLowerCase().includes(searchLower) || invoice.invoiceNumber.toLowerCase().includes(searchLower));

  return (
    <div className="min-h-screen bg-[#f0f4f9] p-2 text-[#101c40] sm:p-4">
      <a href="#invoices" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to Invoices</a>
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_#20345c08] md:flex-row">
        <Sidebar />
        <main id="invoices" className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">

        <div className="mb-9 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Invoices</h1>
            <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Create and send professional invoices for your brand deals.</p>
          </div>
          <Link href="/invoices/new" className="rounded-lg bg-[#243657] px-5 py-3 text-sm font-semibold text-white shadow-[0_3px_10px_#20345c20] transition-colors hover:bg-[#172846] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            + Create Invoice
          </Link>
        </div>

        <p role="status" className="mb-4 text-sm text-[#53668e]">{notice}</p>

        <section aria-label="Search invoices" className="mb-7">
          <label className="block w-full sm:w-64">
            <span className="sr-only">Search invoices</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search brand or invoice #…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-blue-600"
            />
          </label>
        </section>

        <section aria-labelledby="invoices-heading" className="overflow-hidden rounded-xl border border-[#e5ebf5] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
            <h2 id="invoices-heading" className="text-lg font-bold">All Invoices</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Up to {filteredInvoices.length} invoices.</caption>
              <thead className="bg-[#f5f7fb] text-xs text-[#405579]">
                <tr>
                  {["Invoice #", "Brand", "Issue Date", "Due Date", "Total"].map((label) => (
                    <th key={label} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{label}</th>
                  ))}
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-[#53668e]">
                    {invoices.length === 0 ? "No invoices yet. Create your first invoice." : "No invoices match your search."}
                  </td></tr>
                )}
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="border-t border-[#edf1f8] hover:bg-[#fafbfe]">
                    <td className="whitespace-nowrap px-5 py-4 font-medium">{invoice.invoiceNumber}</td>
                    <td className="whitespace-nowrap px-5 py-4">{invoice.brand}</td>
                    <td className="whitespace-nowrap px-5 py-4">{formatDate(invoice.issueDate)}</td>
                    <td className="whitespace-nowrap px-5 py-4">{formatDate(invoice.dueDate)}</td>
                    <td className="whitespace-nowrap px-5 py-4 tabular-nums">{formatAmount(invoiceTotal(invoice), invoice.currency)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-2">
                        {invoice.pdfUrl && <>
                          <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">
                            View Invoice<span className="sr-only"> (opens in a new tab)</span>
                          </a>
                          <a href={`${invoice.pdfUrl}?download=${invoice.invoiceNumber}.pdf`} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">
                            Download PDF
                          </a>
                        </>}
                        <button type="button" disabled={deletingId !== null} onClick={() => void deleteInvoice(invoice)} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                          {deletingId === invoice.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}
