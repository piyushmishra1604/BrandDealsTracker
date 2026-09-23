import { isDate } from "./deals";

export type OutreachSource = "Instagram" | "Email" | "LinkedIn" | "Website Form" | "Other";
export const outreachSources: OutreachSource[] = ["Instagram", "Email", "LinkedIn", "Website Form", "Other"];

export type OutreachStatus = "New" | "In Conversation" | "Interested" | "Not Interested" | "Converted";
export const outreachStatuses: OutreachStatus[] = ["New", "In Conversation", "Interested", "Not Interested", "Converted"];

export type Outreach = {
  id: string;
  brandName: string;
  contactPerson?: string;
  contactRole?: string;
  source: OutreachSource;
  dateReachedOut: string;
  status: OutreachStatus;
  notes?: string;
  // Set by the database trigger on every save; shown as the "Last Update" column.
  updated_at?: string;
};

export function isOutreach(value: unknown): value is Outreach {
  if (!value || typeof value !== "object") return false;
  const outreach = value as Outreach;
  return typeof outreach.id === "string" && !!outreach.id
    && typeof outreach.brandName === "string" && !!outreach.brandName.trim() && outreach.brandName.length <= 120
    && outreachSources.includes(outreach.source)
    && outreachStatuses.includes(outreach.status)
    && isDate(outreach.dateReachedOut)
    && (["contactPerson", "contactRole"] as const).every(key =>
      outreach[key] === undefined || (typeof outreach[key] === "string" && outreach[key].length <= 120))
    && (outreach.notes === undefined || (typeof outreach.notes === "string" && outreach.notes.length <= 5000));
}
