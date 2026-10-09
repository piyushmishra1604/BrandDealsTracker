import { NextResponse } from "next/server";
import { requireCreator } from "@/lib/auth/account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isDeal, dealDateError, type Deal } from "@/lib/deals";

export async function GET() {
  const user = await requireCreator();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await getSupabaseAdmin().from("deals").select("*").eq("user_id", user.sub).order("dealDate", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data.every(isDeal)) return NextResponse.json({ error: "The saved deals have an unexpected format." }, { status: 500 });
  return NextResponse.json({ deals: data });
}

export async function POST(request: Request) {
  const user = await requireCreator();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let deal: unknown;
  try { deal = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!isDeal(deal)) return NextResponse.json({ error: "Invalid deal data." }, { status: 400 });
  const dateError = dealDateError(deal as Deal);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("deals").select("user_id").eq("id", (deal as Deal).id).maybeSingle();
  if (existing && existing.user_id !== user.sub) return NextResponse.json({ error: "You don't have access to this deal." }, { status: 403 });

  const { data, error } = await supabase.from("deals").upsert({ ...(deal as Deal), user_id: user.sub }, { onConflict: "id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!isDeal(data)) return NextResponse.json({ error: "The database returned an unexpected result." }, { status: 500 });
  return NextResponse.json({ deal: data });
}
