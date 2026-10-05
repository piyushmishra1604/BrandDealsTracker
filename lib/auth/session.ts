import { cookies } from "next/headers";
import { signSessionToken, verifySessionToken, type SessionPayload } from "./jwt";

const SESSION_COOKIE = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function createSession(payload: SessionPayload) {
  const token = await signSessionToken(payload);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
