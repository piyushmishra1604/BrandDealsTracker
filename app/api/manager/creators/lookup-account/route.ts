import { NextResponse } from "next/server";
import { requireManagerAccount } from "@/lib/auth/account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Exact-email lookup only (no partial/autocomplete search) so a manager must already
// know the creator's registered email — the same trust boundary "invite by email"
// would have, just without actually sending an email yet.
export async function GET(request: Request) {
  const manager = await requireManagerAccount();
  if (!manager) return NextResponse.json({ error: "Not signed in as a manager." }, { status: 401 });

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const { data: account } = await getSupabaseAdmin()
    .from("app_users")
    .select("id, email")
    .eq("email", email)
    .eq("account_type", "creator")
    .maybeSingle();

  if (!account) return NextResponse.json({ error: "No creator account found with that email." }, { status: 404 });
  return NextResponse.json({ account });
}
