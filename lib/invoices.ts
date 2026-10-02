import { isDate } from "./deals";

export type InvoiceItem = {
  description: string;
  quantity: number;
  rate: number;
};

export function isInvoiceItems(value: unknown): value is InvoiceItem[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= 50 && value.every(entry => {
    if (!entry || typeof entry !== "object") return false;
    const item = entry as InvoiceItem;
    return typeof item.description === "string" && !!item.description.trim() && item.description.length <= 200
      && Number.isFinite(item.quantity) && item.quantity > 0 && item.quantity <= 999
      && Number.isFinite(item.rate) && item.rate >= 0 && item.rate <= 100_000_000;
  });
}

export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";
export const currencies: { code: CurrencyCode; label: string }[] = [
  { code: "INR", label: "INR (₹)" },
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
];
export const currencySymbols: Record<CurrencyCode, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

export type Invoice = {
  id: string;
  invoiceNumber: string;
  brand: string;
  issueDate: string;
  dueDate: string;
  currency: CurrencyCode;
  senderName: string;
  senderEmail?: string;
  senderAddress?: string;
  items: InvoiceItem[];
  notes?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  ifscOrSwift?: string;
  upiId?: string;
  // Set by the database trigger on every save; shown as the "Last Update" column.
  updated_at?: string;
};

export function invoiceTotal(invoice: Pick<Invoice, "items">) {
  return invoice.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
}

export function isInvoice(value: unknown): value is Invoice {
  if (!value || typeof value !== "object") return false;
  const invoice = value as Invoice;
  return typeof invoice.id === "string" && !!invoice.id
    && typeof invoice.invoiceNumber === "string" && !!invoice.invoiceNumber.trim() && invoice.invoiceNumber.length <= 40
    && typeof invoice.brand === "string" && !!invoice.brand.trim() && invoice.brand.length <= 120
    && isDate(invoice.issueDate) && isDate(invoice.dueDate)
    && currencies.some(entry => entry.code === invoice.currency)
    && typeof invoice.senderName === "string" && !!invoice.senderName.trim() && invoice.senderName.length <= 120
    && (invoice.senderEmail === undefined || (typeof invoice.senderEmail === "string" && invoice.senderEmail.length <= 254))
    && (invoice.senderAddress === undefined || (typeof invoice.senderAddress === "string" && invoice.senderAddress.length <= 300))
    && isInvoiceItems(invoice.items)
    && (invoice.notes === undefined || (typeof invoice.notes === "string" && invoice.notes.length <= 5000))
    && (["bankName", "accountHolder", "accountNumber", "ifscOrSwift", "upiId"] as const).every(key =>
      invoice[key] === undefined || (typeof invoice[key] === "string" && invoice[key].length <= 120));
}

export function invoiceDateError(invoice: Pick<Invoice, "issueDate" | "dueDate">) {
  if (invoice.dueDate < invoice.issueDate) return "Due date must be on or after the issue date.";
  return null;
}

export function nextInvoiceNumber(invoices: Invoice[]) {
  const highest = invoices.reduce((max, invoice) => {
    const match = /^INV-(\d+)$/.exec(invoice.invoiceNumber);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `INV-${String(highest + 1).padStart(3, "0")}`;
}
