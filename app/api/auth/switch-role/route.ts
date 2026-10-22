import { NextResponse } from "next/server";
import { getCurrentUser, createSession } from "@/lib/auth/session";
import { getAccountTypes } from "@/lib/auth/account";

// Lets an account with both a creator and a manager profile swap which one the
// current session acts as, without a full logout/login round trip.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { role } = (body ?? {}) as { role?: unknown };
  if (role !== "creator" && role !== "manager") return NextResponse.json({ error: "Choose creator or manager." }, { status: 400 });

  const accountTypes = await getAccountTypes(user.sub);
  if (!accountTypes.includes(role)) {
    const label = role === "creator" ? "Creator" : "Manager";
    return NextResponse.json({ error: `Your account doesn't have a ${label} profile.` }, { status: 403 });
  }

  await createSession({ sub: user.sub, email: user.email, role });
  return NextResponse.json({ user: { id: user.sub, email: user.email, accountType: role, accountTypes } });
}
