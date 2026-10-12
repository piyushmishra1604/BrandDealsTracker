import { type AcceptanceStatus, type Deal, type Deliverable } from "./deals";

// Negotiation rules for deals a manager assigned from a campaign (M5/M6).
//
// pending   manager's offer is open, waiting for the creator
// countered creator's counter-offer is open, waiting for the manager
// accepted  creator accepted; waiting for the manager to confirm
// confirmed agreed amount, final until the manager opens a new offer
// declined  creator declined; the manager can send a new offer

export type NegotiationActor = "manager" | "creator";
export type NegotiationEvent = "offer" | "counter" | "accept" | "confirm" | "decline";
export type CreatorAction = "accept" | "counter" | "decline";

export const MAX_NEGOTIATION_AMOUNT = 100_000_000;
export const MAX_NOTE_LENGTH = 500;

export type Transition =
  | { ok: true; status: AcceptanceStatus; event: NegotiationEvent; actor: NegotiationActor; amount: number }
  | { ok: false; httpStatus: 400 | 409; error: string };

export type OfferTransition =
  | { ok: true; status: AcceptanceStatus; event: "offer" | null }
  | { ok: false; httpStatus: 409; error: string };

export function isNegotiationAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_NEGOTIATION_AMOUNT;
}

export function isNegotiationNote(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_NOTE_LENGTH;
}

const WAITING_MESSAGES: Record<AcceptanceStatus, string> = {
  pending: "",
  countered: "Waiting for the manager to respond to your counter-offer.",
  accepted: "You have accepted this amount. Waiting for the manager to confirm it.",
  confirmed: "This deal is confirmed.",
  declined: "You declined this offer. Waiting for the manager to send a new one.",
  manual: "",
};

export function creatorTransition(input: {
  status: AcceptanceStatus;
  amount: number;
  action: CreatorAction;
  counterAmount?: unknown;
}): Transition {
  if (input.status !== "pending") {
    return { ok: false, httpStatus: 409, error: WAITING_MESSAGES[input.status] };
  }
  if (input.action === "accept") {
    return { ok: true, status: "accepted", event: "accept", actor: "creator", amount: input.amount };
  }
  if (input.action === "decline") {
    return { ok: true, status: "declined", event: "decline", actor: "creator", amount: input.amount };
  }
  if (!isNegotiationAmount(input.counterAmount)) {
    return { ok: false, httpStatus: 400, error: "Enter a valid counter-offer amount." };
  }
  if (input.counterAmount === input.amount) {
    return { ok: false, httpStatus: 400, error: "Your counter-offer must be different from the current amount." };
  }
  return { ok: true, status: "countered", event: "counter", actor: "creator", amount: input.counterAmount };
}

// A manager save only creates an offer when the amount changes or the deal was declined.
// Other edits (dates, deliverables, notes) keep the current status.
export function managerOfferTransition(input: { status: AcceptanceStatus; amountChanged: boolean }): OfferTransition {
  // Manual deals were agreed off-platform, so the manager amends them directly with no offer.
  if (input.status === "manual") return { ok: true, status: "manual", event: null };
  if (input.status === "declined") return { ok: true, status: "pending", event: "offer" };
  if (!input.amountChanged) return { ok: true, status: input.status, event: null };
  if (input.status === "accepted") {
    return { ok: false, httpStatus: 409, error: "The creator has accepted this amount. Confirm it before changing the amount." };
  }
  return { ok: true, status: "pending", event: "offer" };
}

export function managerConfirmTransition(status: AcceptanceStatus, amount: number): Transition {
  if (status === "accepted" || status === "countered") {
    return { ok: true, status: "confirmed", event: "confirm", actor: "manager", amount };
  }
  return { ok: false, httpStatus: 409, error: "There is nothing to confirm right now." };
}

// Fields a creator may change on a deal a manager assigned to them. Everything else
// (brand, amount, dates, deliverable structure, assignment and status fields) is set by the
// manager, so the server must reject any attempt to change it.
export const CREATOR_LOCKED_ASSIGNED_FIELDS = [
  "brand", "amount", "dealDate", "dueDate", "workspaceId", "campaignId", "creatorId", "assignedByUserId", "acceptanceStatus",
] as const;

export const UNASSIGNED_DEAL_FIELDS = {
  workspaceId: null,
  campaignId: null,
  creatorId: null,
  assignedByUserId: null,
  acceptanceStatus: null,
} as const;

export function sameDeliverableStructure(a: Deliverable[] | undefined, b: Deliverable[] | undefined): boolean {
  const left = a ?? [];
  const right = b ?? [];
  return left.length === right.length && left.every((item, index) =>
    item.type === right[index].type && item.quantity === right[index].quantity);
}

export type CreatorEditChanges = Partial<Pick<Deal,
  "instagramUrl" | "deliverables" | "notes" | "category" | "contactName" | "contactEmail" | "contactPhone"
  | "billingAddress" | "contentCreated" | "sentToBrand" | "posted" | "moneyReceived">>;

export function creatorAssignedEdit(existing: Deal, incoming: Deal): { ok: true; changes: CreatorEditChanges } | { ok: false; error: string } {
  for (const field of CREATOR_LOCKED_ASSIGNED_FIELDS) {
    if ((existing[field] ?? null) !== (incoming[field] ?? null)) {
      return { ok: false, error: "This deal was assigned by the manager. Only status, notes, contact details, and delivery progress can be changed." };
    }
  }
  if (!sameDeliverableStructure(existing.deliverables, incoming.deliverables)) {
    return { ok: false, error: "The deliverable types and quantities are set by the manager. You can only mark them done." };
  }

  const doneFlags = incoming.deliverables ?? [];
  return {
    ok: true,
    changes: {
      instagramUrl: incoming.instagramUrl ?? null,
      deliverables: (existing.deliverables ?? []).map((item, index) => ({ ...item, done: doneFlags[index]?.done === true })),
      notes: incoming.notes ?? "",
      category: incoming.category ?? "",
      contactName: incoming.contactName ?? "",
      contactEmail: incoming.contactEmail ?? "",
      contactPhone: incoming.contactPhone ?? "",
      billingAddress: incoming.billingAddress ?? "",
      contentCreated: incoming.contentCreated,
      sentToBrand: incoming.sentToBrand,
      posted: incoming.posted,
      moneyReceived: incoming.moneyReceived,
    },
  };
}

export type ManagerAssignmentInput = {
  amount: number;
  dueDate: string;
  deliverables?: Deliverable[];
  notes?: string;
};

// Manager-owned fields for an assigned deal. Creator progress (delivery steps, done flags) is
// kept when the deliverable structure is unchanged, so re-sending an offer never wipes it.
export function managerAssignedFields(existing: Deal | null, input: ManagerAssignmentInput, brand: string) {
  const requested = input.deliverables ?? [];
  const keepProgress = existing !== null && sameDeliverableStructure(existing.deliverables, requested);
  return {
    brand,
    amount: input.amount,
    dueDate: input.dueDate,
    deliverables: keepProgress
      ? existing?.deliverables ?? []
      : requested.map(item => ({ type: item.type, quantity: item.quantity, done: false })),
    notes: input.notes ?? "",
  };
}
