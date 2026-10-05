import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isOutreach, type Outreach } from "@/lib/outreach";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await getSupabaseAdmin().from("outreach").select("*").eq("user_id", user.sub).order("dateReachedOut", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data.every(isOutreach)) return NextResponse.json({ error: "The saved outreach records have an unexpected format." }, { status: 500 });
  return NextResponse.json({ outreach: data });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let item: unknown;
  try { item = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!isOutreach(item)) return NextResponse.json({ error: "Invalid outreach data." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("outreach").select("user_id").eq("id", (item as Outreach).id).maybeSingle();
  if (existing && existing.user_id !== user.sub) return NextResponse.json({ error: "You don't have access to this record." }, { status: 403 });

  const { data, error } = await supabase.from("outreach").upsert({ ...(item as Outreach), user_id: user.sub }, { onConflict: "id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!isOutreach(data)) return NextResponse.json({ error: "The database returned an unexpected result." }, { status: 500 });
  return NextResponse.json({ outreach: data });
}
