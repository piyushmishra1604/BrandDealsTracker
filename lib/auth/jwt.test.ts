import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { signSessionToken, verifySessionToken } from "./jwt";

describe("session tokens", () => {
  it("round-trips a valid session", async () => {
    const token = await signSessionToken({ sub: "user-1", email: "a@example.com" });
    expect(await verifySessionToken(token)).toEqual({ sub: "user-1", email: "a@example.com" });
  });

  it("rejects a garbage/forged token", async () => {
    expect(await verifySessionToken("not-a-real-jwt")).toBeNull();
  });

  it("rejects a token signed with a different secret (forged credentials)", async () => {
    const secret = new TextEncoder().encode("a-completely-different-secret-0123456789");
    const forged = await new SignJWT({ sub: "attacker", email: "attacker@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(secret);
    expect(await verifySessionToken(forged)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET!);
    const expired = await new SignJWT({ sub: "user-1", email: "a@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 40)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 10) // expired 10 days ago
      .sign(secret);
    expect(await verifySessionToken(expired)).toBeNull();
  });

  it("rejects a payload missing required claims", async () => {
    const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET!);
    const incomplete = await new SignJWT({ sub: "user-1" }) // no email claim
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(secret);
    expect(await verifySessionToken(incomplete)).toBeNull();
  });
});
