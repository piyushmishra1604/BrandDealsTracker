// Client-safe notification types. Server helpers live in notification-store.ts.

export type AppNotification = {
  id: string;
  kind: "deal_assigned";
  dealId: string | null;
  brand: string | null;
  readAt: string | null;
  createdAt: string;
};

export function describeNotification(notification: AppNotification): string {
  if (notification.kind === "deal_assigned") {
    return notification.brand ? `A manager assigned you a deal for ${notification.brand}.` : "A manager assigned you a deal.";
  }
  return "You have a new notification.";
}
