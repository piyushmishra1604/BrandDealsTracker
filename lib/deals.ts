export type Deliverable = {
  type: "Reel" | "Story" | "Post" | "Ad Rights" | "Other";
  quantity: number;
};

export function isDeliverables(value: unknown): value is Deliverable[] {
  return Array.isArray(value) && value.length <= 50 && value.every(item =>
    item && typeof item === "object" && ["Reel", "Story", "Post", "Ad Rights", "Other"].includes(item.type)
    && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 999,
  );
}

export type Deal = {
  id: string;
  brand: string;
  instagramUrl?: string | null;
  deliverables?: Deliverable[];
  notes?: string;
  category?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  dealDate: string;
  amount: number;
  dueDate: string;
  contentCreated: boolean;
  posted: boolean;
  moneyReceived: boolean;
};

export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "0001-01-01") return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isDeal(value: unknown): value is Deal {
  if (!value || typeof value !== "object") return false;
  const deal = value as Deal;
  return typeof deal.id === "string" && !!deal.id && typeof deal.brand === "string" && !!deal.brand.trim()
    && typeof deal.amount === "number" && Number.isFinite(deal.amount) && deal.amount >= 0
    && isDate(deal.dealDate) && isDate(deal.dueDate)
    && (deal.instagramUrl == null || isInstagramUrl(deal.instagramUrl))
    && (deal.deliverables === undefined || isDeliverables(deal.deliverables))
    && (deal.notes === undefined || (typeof deal.notes === "string" && deal.notes.length <= 5000))
    && (["category", "contactName", "contactEmail", "contactPhone"] as const).every(key =>
      deal[key] === undefined || (typeof deal[key] === "string" && deal[key].length <= (key === "contactEmail" ? 254 : key === "contactPhone" ? 16 : 120)))
    && typeof deal.contentCreated === "boolean" && typeof deal.posted === "boolean" && typeof deal.moneyReceived === "boolean";
}

export function isInstagramUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && ["instagram.com", "www.instagram.com"].includes(url.hostname)
      && !url.username && !url.password && !url.port;
  } catch { return false; }
}


// Use one business timezone in both the browser and database checks.
export function todayDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function dealDateError(deal: Deal, today = todayDate()): string | null {
  if (deal.dealDate > today) return "Deal date cannot be in the future. Choose today or an earlier date.";
  if (deal.dueDate < deal.dealDate) return "Content due date must be on or after the deal date.";
  return null;
}
