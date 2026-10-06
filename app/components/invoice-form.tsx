"use client";

import { Banknote, Building2, FileText, Plus, Receipt, Trash2, User } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { type Deal, todayDate } from "@/lib/deals";
import { InvoicePdfDocument } from "@/lib/invoice-pdf";
import { type CurrencyCode, type Invoice, type InvoiceItem, currencies, invoiceDateError, isInvoice, nextInvoiceNumber } from "@/lib/invoices";
import { type Profile } from "@/lib/profile";
import { FormSection } from "./form-section";
import { InvoicePreview } from "./invoice-preview";

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

// Summarizes a deal's agreed deliverables into a single invoice line item.
function dealItemDescription(deal: Deal) {
  if (deal.deliverables?.length) {
    return deal.deliverables.map(item => `${item.quantity}x ${item.type}`).join(", ");
  }
  return `${deal.brand} collaboration`;
}

export function InvoiceForm({ deals, invoices, saveInvoice, profile, dealId, initialInvoice, onSaved, onCancel }: {
  deals: Deal[];
  invoices: Invoice[];
  saveInvoice: (invoice: Invoice) => Promise<string | null>;
  profile: Profile;
  dealId?: string | null;
  initialInvoice?: Invoice;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const brands = Array.from(new Set(deals.map(deal => deal.brand))).sort();
  const prefillDeal = deals.find(deal => deal.id === dealId);
  const issueDate = todayDate();
  const [invoice, setInvoice] = useState<Invoice>(() => {
    if (initialInvoice) return initialInvoice;
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

  const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500";

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

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-6">
        <FormSection step={1} icon={FileText} title="Invoice Details" description="Add the basic information for this invoice.">
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
        </FormSection>

        <FormSection step={2} icon={Building2} title="Bill To" description="The brand's company name may differ from the brand you work with — this is what appears on the invoice.">
          <label className="mb-4 block text-xs text-[#405579]">Company Name
            <input required maxLength={120} placeholder="e.g. Ball Lifestyle Pvt Ltd" value={invoice.companyName} onChange={(event) => setInvoice(current => ({ ...current, companyName: event.target.value }))} className={inputClass} />
          </label>
          <label className="text-xs text-[#405579]">Billing Address
            <textarea rows={5} maxLength={1000} value={invoice.billToAddress ?? ""} onChange={(event) => setInvoice(current => ({ ...current, billToAddress: event.target.value }))} placeholder={"Registered company name\nGSTIN: ...\n\nAddress line 1\nAddress line 2\nCity, State PIN"} className={`${inputClass} font-mono`} />
          </label>
        </FormSection>

        <FormSection step={3} icon={User} title="Your Details" description="Your information will appear on the invoice.">
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
        </FormSection>

        <FormSection step={4} icon={Banknote} title="Payment Details" description="Add your bank details so the brand knows where to send payment (optional).">
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
        </FormSection>

        <FormSection
          step={5}
          icon={Receipt}
          title="Items"
          description="Add the items/services for this invoice."
          action={<button type="button" disabled={invoice.items.length >= 50} onClick={() => setInvoice(current => ({ ...current, items: [...current.items, { description: "", quantity: 1, rate: 0 }] }))} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100 disabled:opacity-50">
            <Plus className="h-4 w-4" strokeWidth={2.2} /> Add Item
          </button>}
        >
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
                <button type="button" aria-label={`Remove item ${index + 1}`} disabled={invoice.items.length <= 1} onClick={() => setInvoice(current => ({ ...current, items: current.items.filter((_, i) => i !== index) }))} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" strokeWidth={2} /> Remove
                </button>
              </div>
            ))}
          </div>
          <label className="mt-4 block text-xs text-[#405579]">Notes (Optional)
            <textarea rows={3} maxLength={5000} value={invoice.notes ?? ""} onChange={(event) => setInvoice(current => ({ ...current, notes: event.target.value }))} className={inputClass} />
          </label>
        </FormSection>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="button" disabled={saving} onClick={() => void handleSave()} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : initialInvoice ? "Save Changes" : "Save Invoice"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-[#405579] transition-colors hover:bg-slate-50">Cancel</button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold">Invoice Preview</h2>
            <p className="mt-0.5 truncate text-xs text-[#53668e]">This is how your invoice will look.</p>
          </div>
          <div className="flex shrink-0 rounded-lg border border-slate-200 p-1 text-sm">
            <span className="rounded-md bg-brand-50 px-3 py-1.5 font-medium text-brand-600">Preview</span>
            <button type="button" disabled title="Custom invoice designs are coming in a later milestone" className="cursor-not-allowed rounded-md px-3 py-1.5 text-[#53668e]">Edit Design</button>
          </div>
        </div>

        <InvoicePreview invoice={invoice} />
      </section>
    </div>
  );
}
