import { isDate } from "./deals";
import { currencies, type CurrencyCode } from "./invoices";

export type CampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export const campaignStatuses: CampaignStatus[] = ["draft", "active", "paused", "completed", "archived"];

export type Campaign = {
  id: string;
  workspaceId: string;
  brand: string;
  title: string;
  budget: number;
  currency: CurrencyCode;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  createdBy?: string | null;
  imageUrl?: string | null;
  category?: string | null;
  description?: string | null;
  notes?: string | null;
  // Filled in once campaign-creator membership exists (M4); always 0 until then.
  creatorCount?: number;
  created_at?: string;
  updated_at?: string;
};

export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return typeof value === "string" && campaignStatuses.includes(value as CampaignStatus);
}

// Validates the fields a manager submits when creating/editing a campaign. Server-assigned
// fields (id, workspaceId, timestamps) are checked separately by the route that reads them.
export type CampaignInput = Pick<Campaign, "brand" | "title" | "budget" | "currency" | "startDate" | "endDate" | "status" | "category" | "description">;

export function isCampaignInput(value: unknown): value is CampaignInput {
  if (!value || typeof value !== "object") return false;
  const campaign = value as CampaignInput;
  return typeof campaign.brand === "string" && !!campaign.brand.trim() && campaign.brand.length <= 120
    && typeof campaign.title === "string" && !!campaign.title.trim() && campaign.title.length <= 160
    && typeof campaign.budget === "number" && Number.isFinite(campaign.budget) && campaign.budget >= 0
    && currencies.some(entry => entry.code === campaign.currency)
    && isDate(campaign.startDate) && isDate(campaign.endDate)
    && isCampaignStatus(campaign.status)
    && (campaign.category == null || campaign.category === "" || (typeof campaign.category === "string" && campaign.category.length <= 120))
    && (campaign.description == null || campaign.description === "" || (typeof campaign.description === "string" && campaign.description.length <= 500));
}

export function campaignDateError(campaign: Pick<Campaign, "startDate" | "endDate">): string | null {
  if (campaign.endDate < campaign.startDate) return "End date must be on or after the start date.";
  return null;
}

export function isValidImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch { return false; }
}

export function isValidCampaignNotes(value: unknown): value is string {
  return typeof value === "string" && value.length <= 5000;
}

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  draft: "Draft",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  archived: "Archived",
};
