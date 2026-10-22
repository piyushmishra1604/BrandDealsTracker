import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { email, password, accountType } = (body ?? {}) as { email?: unknown; password?: unknown; accountType?: unknown };

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  if (accountType !== "creator" && accountType !== "manager") {
    return NextResponse.json({ error: "Choose whether you're signing in as a creator or a manager." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase.from("app_users").select("id, email, password_hash, account_types").eq("email", normalizedEmail).maybeSingle();

  // Same generic message whether the email doesn't exist or the password is wrong, to avoid leaking which emails are registered.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  // Checked only after the password is verified, so this never helps an attacker guess
  // whether an email exists — it just catches someone picking a profile this account doesn't have.
  const accountTypes: ("creator" | "manager")[] = Array.isArray(user.account_types) ? user.account_types : [];
  if (!accountTypes.includes(accountType)) {
    const label = accountType === "creator" ? "Creator" : "Manager";
    return NextResponse.json({ error: `This account doesn't have a ${label} profile yet. Sign up to add one.` }, { status: 401 });
  }

  await createSession({ sub: user.id, email: user.email, role: accountType });
  return NextResponse.json({ user: { id: user.id, email: user.email, accountType, accountTypes } });
}
