import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isProfile, type Profile } from "@/lib/profile";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const supabase = getSupabaseAdmin();
  let row;
  try {
    const { data: existing, error: selectError } = await supabase.from("profile").select("*").eq("user_id", user.sub).maybeSingle();
    if (selectError) throw selectError;
    row = existing;
    if (!row) {
      const { data: created, error: insertError } = await supabase.from("profile").insert({ user_id: user.sub, senderName: "" }).select().single();
      if (insertError) throw insertError;
      row = created;
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not load your profile." }, { status: 500 });
  }
  if (!isProfile(row)) return NextResponse.json({ error: "The saved profile has an unexpected format." }, { status: 500 });
  return NextResponse.json({ profile: row });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let updated: unknown;
  try { updated = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!isProfile(updated)) return NextResponse.json({ error: "Invalid profile data." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("profile").select("user_id").eq("id", (updated as Profile).id).maybeSingle();
  if (!existing || existing.user_id !== user.sub) return NextResponse.json({ error: "You don't have access to this profile." }, { status: 403 });

  const { data, error } = await supabase.from("profile").update(updated).eq("id", (updated as Profile).id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!isProfile(data)) return NextResponse.json({ error: "The database returned an unexpected result." }, { status: 500 });
  return NextResponse.json({ profile: data });
}
