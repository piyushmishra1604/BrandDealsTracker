"use client";

import { useEffect, useState, type ReactNode } from "react";
import { type Deal } from "@/lib/deals";
import { type Invoice } from "@/lib/invoices";
import { CloudInvoices } from "./cloud-invoices";
import { CloudProfile } from "./cloud-profile";
import { InvoiceForm } from "./invoice-form";

export function CreateInvoiceModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  // Close on Escape and prevent the dashboard behind the modal from scrolling.
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
        aria-label={`Create invoice for ${deal.brand}`}
        onClick={(event) => event.stopPropagation()}
        className="mx-auto w-full max-w-6xl rounded-2xl bg-white p-5 shadow-xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Create Invoice</h2>
            <p className="mt-1 text-sm text-[#53668e]">For {deal.brand}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
            Close
          </button>
        </div>

        <CloudInvoices>{(invoices: Invoice[], saveInvoice) => (
          <CloudProfile>{(profile) => (
            <InvoiceForm deals={[deal]} invoices={invoices} saveInvoice={saveInvoice} profile={profile} dealId={deal.id} onSaved={onClose} onCancel={onClose} />
          )}</CloudProfile>
        )}</CloudInvoices>
      </div>
    </div>
  );
}

export function CreateInvoiceButton({ deal, className, children }: { deal: Deal; className: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={(event) => { event.stopPropagation(); setOpen(true); }} className={className}>{children}</button>
    {open && <CreateInvoiceModal deal={deal} onClose={() => setOpen(false)} />}
  </>;
}
