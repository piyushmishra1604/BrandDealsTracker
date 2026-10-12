import { createHash, randomBytes } from "node:crypto";

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITATION_PATH = "/invite";

export type CreatorInvitationStatus = "pending" | "accepted" | "expired" | "revoked";

// The raw token only ever exists in the link shown to the manager and in the creator's browser.
// The database keeps just this hash, so a leaked row can't be replayed as a valid link.
export function generateInvitationToken() {
  return randomBytes(32).toString("base64url");
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function invitationExpiresAt(now: Date) {
  return new Date(now.getTime() + INVITATION_TTL_MS).toISOString();
}

export function isInvitationExpired(expiresAt: string, now: Date) {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function emailsMatch(a: string | null | undefined, b: string | null | undefined) {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function buildInvitationUrl(origin: string, token: string) {
  return `${origin}${INVITATION_PATH}?token=${encodeURIComponent(token)}`;
}
