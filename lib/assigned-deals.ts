import { type AcceptanceStatus, type Deal, type Deliverable } from "./deals";

// Negotiation rules for deals a manager assigned from a campaign (M5/M6).
//
// draft     manager created the deal; not sent to the creator yet, so the creator can't see it
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
  draft: "The manager has not sent this offer to you yet.",
  pending: "",
  countered: "Waiting for the manager to respond to your counter-offer.",
  accepted: "You have accepted this amount. Waiting for the manager to confirm it.",
  confirmed: "You have accepted this deal.",
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
  // Accepting is the final offer step, so the deal moves straight to confirmed (shown as Accepted).
  if (input.action === "accept") {
    return { ok: true, status: "confirmed", event: "accept", actor: "creator", amount: input.amount };
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
  // Saving a draft only edits it. Sending it is a separate step, so the manager can review first.
  if (input.status === "draft") return { ok: true, status: "draft", event: null };
  if (input.status === "declined") return { ok: true, status: "pending", event: "offer" };
  if (!input.amountChanged) return { ok: true, status: input.status, event: null };
  // A price change after acceptance is a new offer, so the creator has to accept it again.
  return { ok: true, status: "pending", event: "offer" };
}

// Sending a draft opens the offer for the creator. Only drafts can be sent.
export function managerSendTransition(status: AcceptanceStatus): OfferTransition {
  if (status === "draft") return { ok: true, status: "pending", event: "offer" };
  return { ok: false, httpStatus: 409, error: "Only a created deal that has not been sent can be sent to the creator." };
}

// A creator's counter-offer stays in the offer history until the manager acts on it; the deal's
// own amount keeps the last agreed value. Offers are ordered oldest first.
export function latestCounterAmount(offers: readonly { event: NegotiationEvent; amount: number }[]): number | null {
  for (let index = offers.length - 1; index >= 0; index--) {
    if (offers[index].event === "counter") return offers[index].amount;
  }
  return null;
}

// The manager can mark an offer accepted on the creator's behalf, for example when the creator
// forgot to respond or has no CollabFlow account.
export function managerConfirmTransition(status: AcceptanceStatus, amount: number): Transition {
  if (status === "pending" || status === "countered" || status === "accepted") {
    return { ok: true, status: "confirmed", event: "accept", actor: "manager", amount };
  }
  return { ok: false, httpStatus: 409, error: "This deal is not waiting for acceptance." };
}

// The manager can decline an offer the creator is still considering or has countered.
// Declining leaves the deal open, so the manager can send a new offer afterwards.
export function managerDeclineTransition(status: AcceptanceStatus, amount: number): Transition {
  if (status === "pending" || status === "countered") {
    return { ok: true, status: "declined", event: "decline", actor: "manager", amount };
  }
  return { ok: false, httpStatus: 409, error: "This deal is not waiting for a response." };
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

// Delivery stages are ordered. Each stage implies the flags below it, so a stage
// maps onto the deal's existing boolean flags without any new columns.
export const DELIVERY_STAGES = ["not_started", "content_created", "sent_to_brand", "posted", "settled"] as const;
export type DeliveryStage = (typeof DELIVERY_STAGES)[number];

export const DELIVERY_STAGE_LABELS: Record<DeliveryStage, string> = {
  not_started: "Not started",
  content_created: "Content created",
  sent_to_brand: "Sent to brand",
  posted: "Posted",
  settled: "Settled",
};

export function isDeliveryStage(value: unknown): value is DeliveryStage {
  return typeof value === "string" && (DELIVERY_STAGES as readonly string[]).includes(value);
}

export function deliveryStageOf(deal: Pick<Deal, "contentCreated" | "sentToBrand" | "posted" | "moneyReceived">): DeliveryStage {
  if (deal.moneyReceived) return "settled";
  if (deal.posted) return "posted";
  if (deal.sentToBrand) return "sent_to_brand";
  if (deal.contentCreated) return "content_created";
  return "not_started";
}

// Returns the flag values for a stage. The posted date is kept if the deal was already posted,
// set to today when the deal first moves to posted, and cleared when it is no longer posted.
export function deliveryStageFlags(stage: DeliveryStage, existingPostedDate: string | null | undefined, today: string) {
  const index = DELIVERY_STAGES.indexOf(stage);
  const posted = index >= DELIVERY_STAGES.indexOf("posted");
  return {
    contentCreated: index >= DELIVERY_STAGES.indexOf("content_created"),
    sentToBrand: index >= DELIVERY_STAGES.indexOf("sent_to_brand"),
    posted,
    moneyReceived: index >= DELIVERY_STAGES.indexOf("settled"),
    postedDate: posted ? (existingPostedDate ?? today) : null,
  };
}

// The single status shown to managers and creators: the offer state until it is accepted,
// then the delivery stage.
export type DealProgress = "draft" | "pending" | "declined" | "accepted" | DeliveryStage;

export function dealProgressOf(deal: Pick<Deal, "acceptanceStatus" | "contentCreated" | "sentToBrand" | "posted" | "moneyReceived">): DealProgress {
  const status = deal.acceptanceStatus ?? "pending";
  if (status === "draft") return "draft";
  if (status === "declined") return "declined";
  if (status === "pending" || status === "countered") return "pending";
  const stage = deliveryStageOf(deal);
  return stage === "not_started" ? "accepted" : stage;
}

export const DEAL_PROGRESS_LABELS: Record<DealProgress, string> = {
  draft: "Created",
  pending: "Pending",
  declined: "Declined",
  accepted: "Accepted",
  ...DELIVERY_STAGE_LABELS,
  not_started: "Accepted",
};

// Delivery stages can only be set once the creator has accepted (or the deal was agreed off-platform).
export function canSetDeliveryStage(status: AcceptanceStatus | null | undefined): boolean {
  return status === "confirmed" || status === "manual";
}
