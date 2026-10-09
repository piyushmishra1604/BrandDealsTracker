import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword, isValidPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { email, password, accountType, workspaceName } = (body ?? {}) as {
    email?: unknown; password?: unknown; accountType?: unknown; workspaceName?: unknown;
  };

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: "Password must be 8-200 characters." }, { status: 400 });
  }
  if (accountType !== "creator" && accountType !== "manager") {
    return NextResponse.json({ error: "Choose whether you're signing up as a creator or a manager." }, { status: 400 });
  }
  if (accountType === "manager" && (typeof workspaceName !== "string" || !workspaceName.trim() || workspaceName.length > 120)) {
    return NextResponse.json({ error: "Enter your agency's name (up to 120 characters)." }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase.from("app_users").select("id").eq("email", normalizedEmail).maybeSingle();
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const { data: user, error: insertError } = await supabase
    .from("app_users")
    .insert({ email: normalizedEmail, password_hash: passwordHash, account_type: accountType })
    .select("id, email, account_type")
    .single();
  if (insertError || !user) return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });

  if (accountType === "creator") {
    // Give every new creator their own profile row so the Profile page has something to load.
    await supabase.from("profile").insert({ user_id: user.id, senderName: "" });
  } else {
    // Every new manager starts their own agency workspace, as its owner.
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert({ name: (workspaceName as string).trim() })
      .select("id")
      .single();
    if (workspaceError || !workspace) {
      await supabase.from("app_users").delete().eq("id", user.id);
      return NextResponse.json({ error: "Could not create your agency workspace. Please try again." }, { status: 500 });
    }
    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });
    if (memberError) {
      await supabase.from("workspaces").delete().eq("id", workspace.id);
      await supabase.from("app_users").delete().eq("id", user.id);
      return NextResponse.json({ error: "Could not create your agency workspace. Please try again." }, { status: 500 });
    }
  }

  await createSession({ sub: user.id, email: user.email });
  return NextResponse.json({ user: { id: user.id, email: user.email, accountType: user.account_type } });
}
