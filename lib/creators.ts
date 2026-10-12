export type CreatorStatus = "contact" | "linked";
export const creatorStatuses: CreatorStatus[] = ["contact", "linked"];
export const creatorStatusLabels: Record<CreatorStatus, string> = {
  contact: "Not Invited",
  linked: "Linked",
};

// "external" creators are contacts kept for future campaigns. "managed" creators are
// linked to a CollabFlow account and show up in Creator Management (M4).
export type CreatorRelationship = "external" | "managed";
export const creatorRelationshipLabels: Record<CreatorRelationship, string> = {
  external: "External",
  managed: "Managed",
};
export const creatorRelationships: CreatorRelationship[] = ["external", "managed"];
export function isCreatorRelationship(value: unknown): value is CreatorRelationship {
  return typeof value === "string" && (creatorRelationships as string[]).includes(value);
}
export const MANAGED_REQUIRES_LINK_MESSAGE = "Link this creator to a CollabFlow account before making them managed.";
export const MANAGED_REQUIRES_RESTORE_MESSAGE = "Restore this creator before making them managed.";

export type Creator = {
  id: string;
  workspaceId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  instagramHandle?: string | null;
  category?: string | null;
  notes?: string | null;
  status: CreatorStatus;
  relationship: CreatorRelationship;
  archivedAt?: string | null;
  linkedUserId?: string | null;
  createdBy?: string | null;
  created_at?: string;
  updated_at?: string;
};

// Directory list rows carry counts so the table can show them without extra requests.
// "Active" deals are every deal that isn't declined, so their value is what the agency has committed.
export type CreatorSummary = Creator & {
  campaignCount?: number;
  dealCount?: number;
  activeDealCount?: number;
  activeDealValue?: number;
  completedDealCount?: number;
  completedDealValue?: number;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CreatorInput = Pick<Creator, "name" | "email" | "phone" | "instagramHandle" | "category" | "notes">;

export function isCreatorInput(value: unknown): value is CreatorInput {
  if (!value || typeof value !== "object") return false;
  const creator = value as CreatorInput;
  return typeof creator.name === "string" && !!creator.name.trim() && creator.name.length <= 120
    && (creator.email == null || creator.email === "" || (typeof creator.email === "string" && EMAIL_PATTERN.test(creator.email) && creator.email.length <= 254))
    && (creator.phone == null || creator.phone === "" || (typeof creator.phone === "string" && creator.phone.length <= 16))
    && (creator.instagramHandle == null || creator.instagramHandle === "" || (typeof creator.instagramHandle === "string" && creator.instagramHandle.length <= 50))
    && (creator.category == null || creator.category === "" || (typeof creator.category === "string" && creator.category.length <= 120))
    && (creator.notes == null || creator.notes === "" || (typeof creator.notes === "string" && creator.notes.length <= 5000));
}
