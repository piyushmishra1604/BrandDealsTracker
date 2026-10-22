import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser } from "./session";
import type { SessionPayload } from "./jwt";

export type AccountType = "creator" | "manager";

function isAccountType(value: unknown): value is AccountType {
  return value === "creator" || value === "manager";
}

function isAccountTypeArray(value: unknown): value is AccountType[] {
  return Array.isArray(value) && value.every(isAccountType);
}

// An account can hold both a creator and a manager profile under one login, so this
// returns every role the account has, read fresh from app_users rather than the JWT.
export async function getAccountTypes(userId: string): Promise<AccountType[]> {
  const { data } = await getSupabaseAdmin().from("app_users").select("account_types").eq("id", userId).maybeSingle();
  return isAccountTypeArray(data?.account_types) ? data.account_types : [];
}

export async function hasAccountType(userId: string, type: AccountType): Promise<boolean> {
  return (await getAccountTypes(userId)).includes(type);
}

// Drop-in replacement for getCurrentUser() in creator-only API routes: same { sub, email }
// shape, but also rejects sessions not currently acting as a creator. The active role lives
// in the session cookie (chosen at login or via switch-role); app_users is re-checked so a
// removed role can't keep working off a stale cookie.
export async function requireCreator(): Promise<SessionPayload | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "creator") return null;
  return (await hasAccountType(user.sub, "creator")) ? user : null;
}

export async function requireManagerAccount(): Promise<SessionPayload | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "manager") return null;
  return (await hasAccountType(user.sub, "manager")) ? user : null;
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
