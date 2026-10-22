import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccountTypes } from "@/lib/auth/account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const accountTypes = await getAccountTypes(user.sub);
  if (!accountTypes.includes(user.role)) return NextResponse.json({ user: null }, { status: 401 });
  const { data } = await getSupabaseAdmin().from("app_users").select("username").eq("id", user.sub).maybeSingle();
  return NextResponse.json({ user: { id: user.sub, email: user.email, accountType: user.role, accountTypes, username: data?.username ?? null } });
}
