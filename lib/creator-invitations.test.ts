import { describe, it, expect } from "vitest";
import {
  INVITATION_TTL_MS,
  buildInvitationUrl,
  emailsMatch,
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  isInvitationExpired,
} from "./creator-invitations";

describe("invitation tokens", () => {
  it("generates a long, URL-safe, unique token each time", () => {
    const a = generateInvitationToken();
    const b = generateInvitationToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(a).not.toBe(b);
  });

  it("hashes deterministically and never equals the raw token", () => {
    const token = generateInvitationToken();
    expect(hashInvitationToken(token)).toBe(hashInvitationToken(token));
    expect(hashInvitationToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashInvitationToken(token)).not.toContain(token);
  });
});

describe("invitation expiry", () => {
  const now = new Date("2026-10-13T00:00:00.000Z");

  it("sets expiry seven days out", () => {
    expect(new Date(invitationExpiresAt(now)).getTime() - now.getTime()).toBe(INVITATION_TTL_MS);
  });

  it("treats the expiry instant itself as expired", () => {
    expect(isInvitationExpired(now.toISOString(), now)).toBe(true);
    expect(isInvitationExpired(new Date(now.getTime() + 1000).toISOString(), now)).toBe(false);
  });
});

describe("emailsMatch", () => {
  it("ignores case and surrounding spaces", () => {
    expect(emailsMatch(" Priya@Example.com ", "priya@example.com")).toBe(true);
  });

  it("never matches when either side is missing", () => {
    expect(emailsMatch(null, "a@b.com")).toBe(false);
    expect(emailsMatch("a@b.com", undefined)).toBe(false);
    expect(emailsMatch("", "")).toBe(false);
  });

  it("rejects a different address", () => {
    expect(emailsMatch("a@b.com", "c@b.com")).toBe(false);
  });
});

describe("buildInvitationUrl", () => {
  it("builds an invite link with an encoded token", () => {
    expect(buildInvitationUrl("https://app.example.com", "ab+/c")).toBe("https://app.example.com/invite?token=ab%2B%2Fc");
  });
});
