import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccountType } from "@/lib/auth/account";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  const accountType = await getAccountType(user.sub);
  if (!accountType) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: user.sub, email: user.email, accountType } });
}
