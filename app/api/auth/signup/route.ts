import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword, isValidPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { email, password } = (body ?? {}) as { email?: unknown; password?: unknown };

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "Password must be 8-200 characters." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase.from("app_users").select("id").eq("email", normalizedEmail).maybeSingle();
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const { data: user, error: insertError } = await supabase
    .from("app_users")
    .insert({ email: normalizedEmail, password_hash: passwordHash })
    .select("id, email")
    .single();
  if (insertError || !user) return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });

  // Give every new user their own profile row so the Profile page has something to load.
  await supabase.from("profile").insert({ user_id: user.id, senderName: "" });

  await createSession({ sub: user.id, email: user.email });
  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
