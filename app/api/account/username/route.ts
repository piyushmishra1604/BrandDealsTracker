import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccountTypes } from "@/lib/auth/account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizeUsername, validateUsername } from "@/lib/username";

// Any signed-in account (creator or manager) can have a username.
async function requireAccount() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (await getAccountTypes(user.sub)).length > 0 ? user : null;
}

// Live availability check while typing. Always 200 for a well-formed request, so the UI
// can show the reason inline; `available` is the source of truth for the tick/cross.
export async function GET(request: Request) {
  const user = await requireAccount();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const username = normalizeUsername(new URL(request.url).searchParams.get("username") ?? "");
  const invalid = validateUsername(username);
  if (invalid) return NextResponse.json({ available: false, message: invalid });

  const { data, error } = await getSupabaseAdmin().from("app_users").select("id").eq("username", username).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not check that username. Please try again." }, { status: 500 });

  if (data?.id === user.sub) return NextResponse.json({ available: true, message: "This is your current username." });
  if (data) return NextResponse.json({ available: false, message: "Username is taken." });
  return NextResponse.json({ available: true, message: "Username is available." });
}

export async function PATCH(request: Request) {
  const user = await requireAccount();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const raw = (body as { username?: unknown } | null)?.username;
  if (typeof raw !== "string") return NextResponse.json({ error: "Enter a username." }, { status: 400 });

  const username = normalizeUsername(raw);
  const invalid = validateUsername(username);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  // The unique index is the real guard against two people saving the same name at once.
  const { error } = await getSupabaseAdmin().from("app_users").update({ username }).eq("id", user.sub);
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Username is taken." }, { status: 409 });
    return NextResponse.json({ error: "Could not save your username. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ username });
}
