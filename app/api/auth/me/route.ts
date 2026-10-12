import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccountType } from "@/lib/auth/account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const accountType = await getAccountType(user.sub);
  if (!accountType) return NextResponse.json({ user: null }, { status: 401 });
  const { data } = await getSupabaseAdmin().from("app_users").select("username").eq("id", user.sub).maybeSingle();
  return NextResponse.json({ user: { id: user.sub, email: user.email, accountType, username: data?.username ?? null } });
}
