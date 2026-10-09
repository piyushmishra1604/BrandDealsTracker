import { NextResponse } from "next/server";
import { requireCreator } from "@/lib/auth/account";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isInvoice, invoiceDateError, type Invoice } from "@/lib/invoices";

export async function GET() {
  const user = await requireCreator();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await getSupabaseAdmin().from("invoices").select("*").eq("user_id", user.sub).order("issueDate", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data.every(isInvoice)) return NextResponse.json({ error: "The saved invoices have an unexpected format." }, { status: 500 });
  return NextResponse.json({ invoices: data });
}

export async function POST(request: Request) {
  const user = await requireCreator();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let invoice: unknown;
  try { invoice = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!isInvoice(invoice)) return NextResponse.json({ error: "Invalid invoice data." }, { status: 400 });
  const dateError = invoiceDateError(invoice as Invoice);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("invoices").select("user_id").eq("id", (invoice as Invoice).id).maybeSingle();
  if (existing && existing.user_id !== user.sub) return NextResponse.json({ error: "You don't have access to this invoice." }, { status: 403 });

  const { data, error } = await supabase.from("invoices").upsert({ ...(invoice as Invoice), user_id: user.sub }, { onConflict: "id" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!isInvoice(data)) return NextResponse.json({ error: "The database returned an unexpected result." }, { status: 500 });
  return NextResponse.json({ invoice: data });
}
