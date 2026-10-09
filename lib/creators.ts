export type CreatorStatus = "contact" | "linked";
export const creatorStatuses: CreatorStatus[] = ["contact", "linked"];
export const creatorStatusLabels: Record<CreatorStatus, string> = {
  contact: "Not Invited",
  linked: "Linked",
};

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
  linkedUserId?: string | null;
  createdBy?: string | null;
  created_at?: string;
  updated_at?: string;
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
