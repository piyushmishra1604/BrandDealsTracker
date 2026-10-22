import { SignJWT, jwtVerify } from "jose";

const SESSION_DURATION = "30d";

function getSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("Add AUTH_JWT_SECRET to .env.local, then restart the app.");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  sub: string;
  email: string;
  // Which profile this session is currently acting as. An account can hold both a
  // creator and a manager profile, so this is the active one, not the only one.
  role: "creator" | "manager";
};

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    if (payload.role !== "creator" && payload.role !== "manager") return null;
    return { sub: payload.sub, email: payload.email, role: payload.role };
  } catch { return null; }
}
