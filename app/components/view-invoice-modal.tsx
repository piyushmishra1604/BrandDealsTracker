"use client";

import { useEffect, useState, type ReactNode } from "react";
import { type Invoice } from "@/lib/invoices";
import { CloudDashboard } from "./cloud-dashboard";
import { CloudInvoices } from "./cloud-invoices";
import { CloudProfile } from "./cloud-profile";
import { InvoiceForm } from "./invoice-form";
import { InvoicePreview } from "./invoice-preview";

export function ViewInvoiceModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const [editing, setEditing] = useState(false);

  // Close on Escape and prevent the page behind the modal from scrolling.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div role="presentation" onClick={onClose} className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Invoice ${invoice.invoiceNumber}`}
        onClick={(event) => event.stopPropagation()}
        className={editing ? "mx-auto w-full max-w-6xl rounded-2xl bg-white p-5 shadow-xl sm:p-8" : "mx-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl sm:p-8"}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{editing ? "Edit Invoice" : "Invoice Preview"}</h2>
            <p className="mt-1 text-sm text-[#53668e]">{invoice.invoiceNumber} — {invoice.brand}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!editing && <button type="button" onClick={() => setEditing(true)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">
              Edit
            </button>}
            <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
              Close
            </button>
          </div>
        </div>

        {editing ? (
          <CloudDashboard>{(deals) => (
            <CloudInvoices>{(invoices, saveInvoice) => (
              <CloudProfile>{(profile) => (
                <InvoiceForm deals={deals} invoices={invoices} saveInvoice={saveInvoice} profile={profile} initialInvoice={invoice} onSaved={onClose} onCancel={() => setEditing(false)} />
              )}</CloudProfile>
            )}</CloudInvoices>
          )}</CloudDashboard>
        ) : (
          <InvoicePreview invoice={invoice} />
        )}
      </div>
    </div>
  );
}

export function ViewInvoiceButton({ invoice, className, children }: { invoice: Invoice; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(true); }} className={className}>{children}</button>
    {open && <ViewInvoiceModal invoice={invoice} onClose={() => setOpen(false)} />}
  </>;
}
