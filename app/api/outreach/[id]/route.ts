import { NextResponse } from "next/server";
import { requireCreator } from "@/lib/auth/account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireCreator();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const { data, error } = await getSupabaseAdmin().from("outreach").delete().eq("id", id).eq("user_id", user.sub).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length !== 1) return NextResponse.json({ error: "Deletion was not confirmed. Refresh the page and try again." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
