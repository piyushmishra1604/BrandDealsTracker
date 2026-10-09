import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser } from "./session";
import type { SessionPayload } from "./jwt";

export type AccountType = "creator" | "manager";

function isAccountType(value: unknown): value is AccountType {
  return value === "creator" || value === "manager";
}

// Account type lives in app_users, not the JWT, so it's always read fresh from the
// source of truth instead of trusting a claim baked into a (possibly pre-M1) session cookie.
export async function getAccountType(userId: string): Promise<AccountType | null> {
  const { data } = await getSupabaseAdmin().from("app_users").select("account_type").eq("id", userId).maybeSingle();
  return isAccountType(data?.account_type) ? data.account_type : null;
}

// Drop-in replacement for getCurrentUser() in creator-only API routes: same { sub, email }
// shape, but also rejects manager accounts so a 401 is returned instead of leaking access.
export async function requireCreator(): Promise<SessionPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return (await getAccountType(user.sub)) === "creator" ? user : null;
}

export async function requireManagerAccount(): Promise<SessionPayload | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return (await getAccountType(user.sub)) === "manager" ? user : null;
}

// There's no display-name field on app_users yet, so the top bar derives something
// readable from the email local-part (e.g. "test-manager" -> "Test Manager").
export function displayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? email;
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}
