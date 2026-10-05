"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { type Deal, todayDate } from "@/lib/deals";
import { InvoicePdfDocument } from "@/lib/invoice-pdf";
import { type CurrencyCode, type Invoice, type InvoiceItem, currencies, currencySymbols, invoiceDateError, invoiceTotal, isInvoice, nextInvoiceNumber } from "@/lib/invoices";
import { type Profile } from "@/lib/profile";

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatAmount(amount: number, currency: CurrencyCode) {
  return `${currencySymbols[currency]}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

// Summarizes a deal's agreed deliverables into a single invoice line item.
function dealItemDescription(deal: Deal) {
  if (deal.deliverables?.length) {
    return deal.deliverables.map(item => `${item.quantity}x ${item.type}`).join(", ");
  }
  return `${deal.brand} collaboration`;
}

export function InvoiceForm({ deals, invoices, saveInvoice, profile, dealId, onSaved, onCancel }: {
  deals: Deal[];
  invoices: Invoice[];
  saveInvoice: (invoice: Invoice) => Promise<string | null>;
  profile: Profile;
  dealId?: string | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const brands = Array.from(new Set(deals.map(deal => deal.brand))).sort();
  const prefillDeal = deals.find(deal => deal.id === dealId);
  const issueDate = todayDate();
  const [invoice, setInvoice] = useState<Invoice>(() => {
    const firstAccount = profile.bankAccounts[0];
    return {
      id: crypto.randomUUID(),
      invoiceNumber: nextInvoiceNumber(invoices),
      brand: prefillDeal?.brand ?? brands[0] ?? "",
      companyName: prefillDeal?.brand ?? brands[0] ?? "",
      billToAddress: prefillDeal?.billingAddress ?? "",
      issueDate,
      dueDate: addDays(issueDate, 14),
      currency: "INR",
      senderBrandName: profile.brandName ?? "",
      senderName: profile.senderName,
      senderEmail: profile.senderEmail ?? "",
      senderAddress: profile.senderAddress ?? "",
      items: prefillDeal ? [{ description: dealItemDescription(prefillDeal), quantity: 1, rate: prefillDeal.amount }] : [{ description: "", quantity: 1, rate: 0 }],
      notes: "Thank you for the collaboration!",
      bankName: firstAccount?.bankName ?? "",
      accountHolder: firstAccount?.accountHolder ?? "",
      accountNumber: firstAccount?.accountNumber ?? "",
      ifscOrSwift: firstAccount?.ifscOrSwift ?? "",
      upiId: firstAccount?.upiId ?? "",
    };
  });
  const [selectedAccountId, setSelectedAccountId] = useState(profile.bankAccounts[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600";

  function updateItem(index: number, patch: Partial<InvoiceItem>) {
    setInvoice(current => ({ ...current, items: current.items.map((item, i) => i === index ? { ...item, ...patch } : item) }));
  }

  function selectBrand(brand: string) {
    const matchingDeal = deals.find(deal => deal.brand === brand && deal.billingAddress);
    setInvoice(current => ({ ...current, brand, companyName: brand, billToAddress: matchingDeal?.billingAddress ?? current.billToAddress }));
  }

  function selectBankAccount(accountId: string) {
    setSelectedAccountId(accountId);
    const account = profile.bankAccounts.find(entry => entry.id === accountId);
    setInvoice(current => ({
      ...current,
      bankName: account?.bankName ?? "",
      accountHolder: account?.accountHolder ?? "",
      accountNumber: account?.accountNumber ?? "",
      ifscOrSwift: account?.ifscOrSwift ?? "",
      upiId: account?.upiId ?? "",
    }));
  }

  async function handleSave() {
    const cleaned: Invoice = {
      ...invoice,
      brand: invoice.brand.trim(),
      companyName: invoice.companyName.trim(),
      billToAddress: invoice.billToAddress?.trim(),
      senderBrandName: invoice.senderBrandName?.trim(),
      senderName: invoice.senderName.trim(),
      senderEmail: invoice.senderEmail?.trim(),
      senderAddress: invoice.senderAddress?.trim(),
      notes: invoice.notes?.trim(),
      items: invoice.items.filter(item => item.description.trim()),
      bankName: invoice.bankName?.trim(),
      accountHolder: invoice.accountHolder?.trim(),
      accountNumber: invoice.accountNumber?.trim(),
      ifscOrSwift: invoice.ifscOrSwift?.trim(),
      upiId: invoice.upiId?.trim(),
    };
    if (!isInvoice(cleaned)) {
      setError("Enter a company name, your name, and at least one item with a description, quantity, and rate.");
      return;
    }
    const dateError = invoiceDateError(cleaned);
    if (dateError) { setError(dateError); return; }
    setSaving(true);
    setError("");
    try {
      // Store a PDF snapshot in storage so the invoice can be viewed later from the deal.
      let pdfUrl = cleaned.pdfUrl ?? "";
      try {
        const blob = await pdf(<InvoicePdfDocument invoice={cleaned} />).toBlob();
        const formData = new FormData();
        formData.set("invoiceId", cleaned.id);
        formData.set("file", blob, `${cleaned.id}.pdf`);
        const uploadResponse = await fetch("/api/invoices/pdf", { method: "POST", body: formData });
        if (uploadResponse.ok) { const body = await uploadResponse.json(); pdfUrl = body.url; }
      } catch { /* Save the invoice even if the PDF snapshot fails to generate or upload. */ }
      const saveError = await saveInvoice({ ...cleaned, pdfUrl });
      if (saveError) setError(saveError);
      else onSaved();
    } catch { setError("Could not save the invoice. Please try again."); }
    finally { setSaving(false); }
  }

  const total = invoiceTotal(invoice);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-6">
        <fieldset className="rounded-xl border border-[#e5ebf5] p-5">
          <legend className="px-1 text-base font-bold">Invoice Details</legend>
          <p className="mb-4 text-xs text-[#53668e]">Add the basic information for this invoice.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-[#405579]">Brand
              {prefillDeal ? (
                <input type="text" readOnly disabled value={invoice.brand} className={`${inputClass} cursor-not-allowed bg-slate-50 text-[#53668e]`} />
              ) : (
                <select required value={invoice.brand} onChange={(event) => selectBrand(event.target.value)} className={inputClass}>
                  <option value="" disabled>Select a brand</option>
                  {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              )}
              <span className="mt-1 block text-[#53668e]">For your reference only — never shown on the invoice.</span>
            </label>
            <label className="text-xs text-[#405579]">Invoice Number
              <input required maxLength={40} value={invoice.invoiceNumber} onChange={(event) => setInvoice(current => ({ ...current, invoiceNumber: event.target.value }))} className={inputClass} />
            </label>
            <label className="text-xs text-[#405579]">Issue Date
              <input type="date" required min="0001-01-01" max="9999-12-31" value={invoice.issueDate} onChange={(event) => setInvoice(current => ({ ...current, issueDate: event.target.value }))} className={inputClass} />
            </label>
            <label className="text-xs text-[#405579]">Due Date
              <input type="date" required min="0001-01-01" max="9999-12-31" value={invoice.dueDate} onChange={(event) => setInvoice(current => ({ ...current, dueDate: event.target.value }))} className={inputClass} />
            </label>
            <label className="text-xs text-[#405579]">Currency
              <select value={invoice.currency} onChange={(event) => setInvoice(current => ({ ...current, currency: event.target.value as CurrencyCode }))} className={inputClass}>
                {currencies.map(({ code, label }) => <option key={code} value={code}>{label}</option>)}
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-[#e5ebf5] p-5">
          <legend className="px-1 text-base font-bold">Bill To</legend>
          <p className="mb-4 text-xs text-[#53668e]">The brand&apos;s company name may differ from the brand you work with — this is what appears on the invoice.</p>
          <label className="mb-4 block text-xs text-[#405579]">Company Name
            <input required maxLength={120} placeholder="e.g. Ball Lifestyle Pvt Ltd" value={invoice.companyName} onChange={(event) => setInvoice(current => ({ ...current, companyName: event.target.value }))} className={inputClass} />
          </label>
          <label className="text-xs text-[#405579]">Billing Address
            <textarea rows={5} maxLength={1000} value={invoice.billToAddress ?? ""} onChange={(event) => setInvoice(current => ({ ...current, billToAddress: event.target.value }))} placeholder={"Registered company name\nGSTIN: ...\n\nAddress line 1\nAddress line 2\nCity, State PIN"} className={`${inputClass} font-mono`} />
          </label>
        </fieldset>

        <fieldset className="rounded-xl border border-[#e5ebf5] p-5">
          <legend className="px-1 text-base font-bold">Your Details</legend>
          <p className="mb-4 text-xs text-[#53668e]">Your information will appear on the invoice.</p>
          <div className="grid gap-4">
            <label className="text-xs text-[#405579]">Brand Name
              <input maxLength={120} placeholder="e.g. Ball Lifestyle" value={invoice.senderBrandName ?? ""} onChange={(event) => setInvoice(current => ({ ...current, senderBrandName: event.target.value }))} className={inputClass} />
              <span className="mt-1 block text-[#53668e]">Shown prominently at the top of the invoice.</span>
            </label>
            <label className="text-xs text-[#405579]">Name / Business Name
              <input required maxLength={120} value={invoice.senderName} onChange={(event) => setInvoice(current => ({ ...current, senderName: event.target.value }))} className={inputClass} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs text-[#405579]">Email
                <input type="email" maxLength={254} value={invoice.senderEmail ?? ""} onChange={(event) => setInvoice(current => ({ ...current, senderEmail: event.target.value }))} className={inputClass} />
              </label>
              <label className="text-xs text-[#405579]">Address
                <textarea rows={2} maxLength={300} value={invoice.senderAddress ?? ""} onChange={(event) => setInvoice(current => ({ ...current, senderAddress: event.target.value }))} className={inputClass} />
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-[#e5ebf5] p-5">
          <legend className="px-1 text-base font-bold">Payment Details</legend>
          <p className="mb-4 text-xs text-[#53668e]">Add your bank details so the brand knows where to send payment (optional).</p>
          {profile.bankAccounts.length > 0 && <label className="mb-4 block text-xs text-[#405579]">Saved Bank Account
            <select value={selectedAccountId} onChange={(event) => selectBankAccount(event.target.value)} className={inputClass}>
              <option value="">Enter manually</option>
              {profile.bankAccounts.map(account => <option key={account.id} value={account.id}>{account.label}</option>)}
            </select>
          </label>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-[#405579]">Bank Name
              <input maxLength={120} value={invoice.bankName ?? ""} onChange={(event) => setInvoice(current => ({ ...current, bankName: event.target.value }))} className={inputClass} />
            </label>
            <label className="text-xs text-[#405579]">Account Holder Name
              <input maxLength={120} value={invoice.accountHolder ?? ""} onChange={(event) => setInvoice(current => ({ ...current, accountHolder: event.target.value }))} className={inputClass} />
            </label>
            <label className="text-xs text-[#405579]">Account Number
              <input maxLength={120} value={invoice.accountNumber ?? ""} onChange={(event) => setInvoice(current => ({ ...current, accountNumber: event.target.value }))} className={inputClass} />
            </label>
            <label className="text-xs text-[#405579]">IFSC / SWIFT Code
              <input maxLength={120} value={invoice.ifscOrSwift ?? ""} onChange={(event) => setInvoice(current => ({ ...current, ifscOrSwift: event.target.value }))} className={inputClass} />
            </label>
            <label className="text-xs text-[#405579]">UPI ID
              <input maxLength={120} value={invoice.upiId ?? ""} onChange={(event) => setInvoice(current => ({ ...current, upiId: event.target.value }))} className={inputClass} />
            </label>
          </div>
        </fieldset>

        <fieldset className="rounded-xl border border-[#e5ebf5] p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <legend className="px-1 text-base font-bold">Items</legend>
              <p className="text-xs text-[#53668e]">Add the items/services for this invoice.</p>
            </div>
            <button type="button" disabled={invoice.items.length >= 50} onClick={() => setInvoice(current => ({ ...current, items: [...current.items, { description: "", quantity: 1, rate: 0 }] }))} className="shrink-0 cursor-pointer rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-blue-600 disabled:opacity-50">
              + Add Item
            </button>
          </div>
          <div className="space-y-3">
            {invoice.items.map((item, index) => (
              <div key={index} className="flex flex-wrap items-end gap-3">
                <label className="min-w-40 flex-1 text-xs text-[#405579]">Description
                  <input aria-label={`Item ${index + 1} description`} maxLength={200} value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} className={inputClass} />
                </label>
                <label className="w-20 text-xs text-[#405579]">Qty
                  <input aria-label={`Item ${index + 1} quantity`} type="number" min="1" max="999" step="1" value={Number.isNaN(item.quantity) ? "" : item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.valueAsNumber })} className={inputClass} />
                </label>
                <label className="w-28 text-xs text-[#405579]">Rate
                  <input aria-label={`Item ${index + 1} rate`} type="number" min="0" step="0.01" value={Number.isNaN(item.rate) ? "" : item.rate} onChange={(event) => updateItem(index, { rate: event.target.valueAsNumber })} className={inputClass} />
                </label>
                <button type="button" aria-label={`Remove item ${index + 1}`} disabled={invoice.items.length <= 1} onClick={() => setInvoice(current => ({ ...current, items: current.items.filter((_, i) => i !== index) }))} className="cursor-pointer rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <label className="mt-4 block text-xs text-[#405579]">Notes (Optional)
            <textarea rows={3} maxLength={5000} value={invoice.notes ?? ""} onChange={(event) => setInvoice(current => ({ ...current, notes: event.target.value }))} className={inputClass} />
          </label>
        </fieldset>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="button" disabled={saving} onClick={() => void handleSave()} className="cursor-pointer rounded-lg bg-[#243657] px-5 py-3 text-sm font-semibold text-white hover:bg-[#172846] disabled:opacity-50">
            {saving ? "Saving…" : "Save Invoice"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">Cancel</button>
        </div>
      </section>

      <section className="rounded-xl border border-[#e5ebf5] bg-white p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold">Invoice Preview</h2>
            <p className="text-xs text-[#53668e]">This is how your invoice will look.</p>
          </div>
          <div className="flex shrink-0 rounded-lg border border-[#e5ebf5] p-1 text-sm">
            <span className="rounded-md bg-[#e8efff] px-3 py-1.5 font-medium text-[#0655ff]">Preview</span>
            <button type="button" disabled title="Custom invoice designs are coming in a later milestone" className="cursor-not-allowed rounded-md px-3 py-1.5 text-[#53668e]">Edit Design</button>
          </div>
        </div>

        <div className="rounded-xl border border-[#edf1f8] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-2xl font-bold tracking-tight">{invoice.senderBrandName || "Your Brand"}</p>
            <div className="text-right">
              <p className="text-xl font-bold tracking-tight">INVOICE</p>
              <p className="text-sm text-[#53668e]"># {invoice.invoiceNumber}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-between gap-6 border-t border-[#edf1f8] pt-5">
            <div>
              <p className="text-xs font-medium text-[#53668e]">Bill To</p>
              <p className="font-bold">{invoice.companyName || "Company Name"}</p>
              {invoice.billToAddress && <p className="mt-1 whitespace-pre-line text-sm text-[#53668e]">{invoice.billToAddress}</p>}
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex gap-6"><dt className="text-[#53668e]">Issue Date</dt><dd className="min-w-24 text-right">{formatDate(invoice.issueDate)}</dd></div>
              <div className="flex gap-6"><dt className="text-[#53668e]">Due Date</dt><dd className="min-w-24 text-right">{formatDate(invoice.dueDate)}</dd></div>
              <div className="flex gap-6"><dt className="text-[#53668e]">Currency</dt><dd className="min-w-24 text-right">{currencies.find(c => c.code === invoice.currency)?.label}</dd></div>
            </dl>
          </div>

          <table className="mt-6 w-full text-left text-sm">
            <thead className="border-y border-[#edf1f8] text-xs text-[#53668e]">
              <tr>
                <th scope="col" className="py-2 font-medium">Description</th>
                <th scope="col" className="py-2 text-right font-medium">Qty</th>
                <th scope="col" className="py-2 text-right font-medium">Rate ({currencySymbols[invoice.currency]})</th>
                <th scope="col" className="py-2 text-right font-medium">Amount ({currencySymbols[invoice.currency]})</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.filter(item => item.description.trim()).map((item, index) => (
                <tr key={index} className="border-b border-[#edf1f8]">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(item.rate)}</td>
                  <td className="py-2 text-right tabular-nums">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(item.quantity * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between gap-6"><span className="text-[#53668e]">Subtotal</span><span className="tabular-nums">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(total)}</span></div>
            <div className="flex justify-between gap-6 border-t border-[#edf1f8] pt-1.5 font-bold"><span>Total ({invoice.currency})</span><span className="tabular-nums">{formatAmount(total, invoice.currency)}</span></div>
          </div>

          {(invoice.bankName || invoice.accountHolder || invoice.accountNumber || invoice.ifscOrSwift || invoice.upiId) && <div className="mt-6 border-t border-[#edf1f8] pt-4 text-sm">
            <p className="font-bold">Payment Details</p>
            <dl className="mt-1 space-y-0.5 text-[#53668e]">
              {invoice.bankName && <div className="flex gap-2"><dt>Bank:</dt><dd>{invoice.bankName}</dd></div>}
              {invoice.accountHolder && <div className="flex gap-2"><dt>Account Holder:</dt><dd>{invoice.accountHolder}</dd></div>}
              {invoice.accountNumber && <div className="flex gap-2"><dt>Account Number:</dt><dd>{invoice.accountNumber}</dd></div>}
              {invoice.ifscOrSwift && <div className="flex gap-2"><dt>IFSC/SWIFT:</dt><dd>{invoice.ifscOrSwift}</dd></div>}
              {invoice.upiId && <div className="flex gap-2"><dt>UPI ID:</dt><dd>{invoice.upiId}</dd></div>}
            </dl>
          </div>}

          <div className="mt-6 border-t border-[#edf1f8] pt-4 text-sm">
            <p className="font-bold">From</p>
            <p className="mt-1">{invoice.senderName || "Your Name"}</p>
            {invoice.senderAddress && <p className="whitespace-pre-line text-[#53668e]">{invoice.senderAddress}</p>}
            {invoice.senderEmail && <p className="text-[#53668e]">{invoice.senderEmail}</p>}
          </div>

          {invoice.notes && <div className="mt-6 border-t border-[#edf1f8] pt-4 text-sm">
            <p className="font-bold">Notes</p>
            <p className="mt-1 whitespace-pre-line text-[#53668e]">{invoice.notes}</p>
          </div>}
        </div>
      </section>
    </div>
  );
}
