import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword, isValidPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import type { AccountType } from "@/lib/auth/account";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function setUpCreatorProfile(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string) {
  // Give every new creator profile its own row so the Profile page has something to load.
  await supabase.from("profile").insert({ user_id: userId, senderName: "" });
}

async function setUpManagerWorkspace(supabase: ReturnType<typeof getSupabaseAdmin>, userId: string, workspaceName: string): Promise<boolean> {
  // Every new manager profile starts its own agency workspace, as its owner.
  const { data: workspace, error: workspaceError } = await supabase.from("workspaces").insert({ name: workspaceName }).select("id").single();
  if (workspaceError || !workspace) return false;
  const { error: memberError } = await supabase.from("workspace_members").insert({ workspace_id: workspace.id, user_id: userId, role: "owner" });
  if (memberError) {
    await supabase.from("workspaces").delete().eq("id", workspace.id);
    return false;
  }
  return true;
}

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

  const { data: existing } = await supabase
    .from("app_users")
    .select("id, email, password_hash, account_types")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existing) {
    // Only someone who already knows the password can add a second profile to this
    // email — otherwise this would let anyone attach a manager/creator role to an
    // account they don't own, just by knowing its email.
    if (!(await verifyPassword(password, existing.password_hash))) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const existingTypes: AccountType[] = Array.isArray(existing.account_types) ? existing.account_types : [];
    if (existingTypes.includes(accountType)) {
      const label = accountType === "creator" ? "Creator" : "Manager";
      return NextResponse.json({ error: `This email already has a ${label} profile. Sign in instead.` }, { status: 409 });
    }

    const nextTypes = [...existingTypes, accountType];
    const { error: updateError } = await supabase.from("app_users").update({ account_types: nextTypes }).eq("id", existing.id);
    if (updateError) return NextResponse.json({ error: "Could not add this profile. Please try again." }, { status: 500 });

    const setUpOk = accountType === "creator"
      ? await setUpCreatorProfile(supabase, existing.id).then(() => true)
      : await setUpManagerWorkspace(supabase, existing.id, (workspaceName as string).trim());
    if (!setUpOk) {
      await supabase.from("app_users").update({ account_types: existingTypes }).eq("id", existing.id);
      return NextResponse.json({ error: "Could not create your agency workspace. Please try again." }, { status: 500 });
    }

    await createSession({ sub: existing.id, email: existing.email, role: accountType });
    return NextResponse.json({ user: { id: existing.id, email: existing.email, accountType, accountTypes: nextTypes } });
  }

  const passwordHash = await hashPassword(password);
  const { data: user, error: insertError } = await supabase
    .from("app_users")
    .insert({ email: normalizedEmail, password_hash: passwordHash, account_types: [accountType] })
    .select("id, email, account_types")
    .single();
  if (insertError || !user) return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });

  const setUpOk = accountType === "creator"
    ? await setUpCreatorProfile(supabase, user.id).then(() => true)
    : await setUpManagerWorkspace(supabase, user.id, (workspaceName as string).trim());
  if (!setUpOk) {
    await supabase.from("app_users").delete().eq("id", user.id);
    return NextResponse.json({ error: "Could not create your agency workspace. Please try again." }, { status: 500 });
  }

  await createSession({ sub: user.id, email: user.email, role: accountType });
  return NextResponse.json({ user: { id: user.id, email: user.email, accountType, accountTypes: user.account_types } });
}
