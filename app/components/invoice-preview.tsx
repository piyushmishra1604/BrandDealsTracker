import { type CurrencyCode, type Invoice, currencies, currencySymbols, invoiceTotal } from "@/lib/invoices";

export function formatInvoiceDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function formatInvoiceAmount(amount: number, currency: CurrencyCode) {
  return `${currencySymbols[currency]}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

// Renders the same invoice card used in the create-invoice preview and the view-invoice modal.
export function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const total = invoiceTotal(invoice);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(79,70,229,0.08)]">
      <div aria-hidden="true" className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br from-brand-200/50 to-accent-200/40 blur-2xl" />
      <div aria-hidden="true" className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-brand-500 to-accent-500" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <p className="text-2xl font-bold tracking-tight">{invoice.senderBrandName || "Your Brand"}</p>
        <div className="text-right">
          <p className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">INVOICE</p>
          <p className="text-sm text-[#53668e]"># {invoice.invoiceNumber}</p>
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap justify-between gap-6 border-t border-[#edf1f8] pt-5">
        <div>
          <p className="text-xs font-medium text-[#53668e]">Bill To</p>
          <p className="font-bold">{invoice.companyName || "Company Name"}</p>
          {invoice.billToAddress && <p className="mt-1 whitespace-pre-line text-sm text-[#53668e]">{invoice.billToAddress}</p>}
        </div>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-6"><dt className="text-[#53668e]">Issue Date</dt><dd className="min-w-24 text-right">{formatInvoiceDate(invoice.issueDate)}</dd></div>
          <div className="flex gap-6"><dt className="text-[#53668e]">Due Date</dt><dd className="min-w-24 text-right">{formatInvoiceDate(invoice.dueDate)}</dd></div>
          <div className="flex gap-6"><dt className="text-[#53668e]">Currency</dt><dd className="min-w-24 text-right">{currencies.find(c => c.code === invoice.currency)?.label}</dd></div>
        </dl>
      </div>

      <table className="relative mt-6 w-full text-left text-sm">
        <thead className="border-y border-[#edf1f8] bg-slate-50/60 text-xs text-[#53668e]">
          <tr>
            <th scope="col" className="py-2 pl-2 font-medium">Description</th>
            <th scope="col" className="py-2 text-right font-medium">Qty</th>
            <th scope="col" className="py-2 text-right font-medium">Rate ({currencySymbols[invoice.currency]})</th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">Amount ({currencySymbols[invoice.currency]})</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.filter(item => item.description.trim()).map((item, index) => (
            <tr key={index} className="border-b border-[#edf1f8]">
              <td className="py-2 pl-2">{item.description}</td>
              <td className="py-2 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 text-right tabular-nums">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(item.rate)}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(item.quantity * item.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="relative mt-2 space-y-1.5 text-sm">
        <div className="flex justify-between gap-6 px-2"><span className="text-[#53668e]">Subtotal</span><span className="tabular-nums">{new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(total)}</span></div>
        <div className="flex items-center justify-between gap-6 rounded-xl bg-gradient-to-r from-brand-50 to-accent-50 px-3 py-2.5 font-bold">
          <span>Total ({invoice.currency})</span>
          <span className="tabular-nums text-brand-700">{formatInvoiceAmount(total, invoice.currency)}</span>
        </div>
      </div>

      {(invoice.bankName || invoice.accountHolder || invoice.accountNumber || invoice.ifscOrSwift || invoice.upiId) && <div className="relative mt-6 border-t border-[#edf1f8] pt-4 text-sm">
        <p className="font-bold">Payment Details</p>
        <dl className="mt-1 space-y-0.5 text-[#53668e]">
          {invoice.bankName && <div className="flex gap-2"><dt>Bank:</dt><dd>{invoice.bankName}</dd></div>}
          {invoice.accountHolder && <div className="flex gap-2"><dt>Account Holder:</dt><dd>{invoice.accountHolder}</dd></div>}
          {invoice.accountNumber && <div className="flex gap-2"><dt>Account Number:</dt><dd>{invoice.accountNumber}</dd></div>}
          {invoice.ifscOrSwift && <div className="flex gap-2"><dt>IFSC/SWIFT:</dt><dd>{invoice.ifscOrSwift}</dd></div>}
          {invoice.upiId && <div className="flex gap-2"><dt>UPI ID:</dt><dd>{invoice.upiId}</dd></div>}
        </dl>
      </div>}

      <div className="relative mt-6 border-t border-[#edf1f8] pt-4 text-sm">
        <p className="font-bold">From</p>
        <p className="mt-1">{invoice.senderName || "Your Name"}</p>
        {invoice.senderAddress && <p className="whitespace-pre-line text-[#53668e]">{invoice.senderAddress}</p>}
        {invoice.senderEmail && <p className="text-[#53668e]">{invoice.senderEmail}</p>}
      </div>

      {invoice.notes && <div className="relative mt-6 border-t border-[#edf1f8] pt-4 text-sm">
        <p className="font-bold">Notes</p>
        <p className="mt-1 whitespace-pre-line text-[#53668e]">{invoice.notes}</p>
      </div>}
    </div>
  );
}
