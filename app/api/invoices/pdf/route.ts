import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SAFE_ID = /^[a-zA-Z0-9-]{1,100}$/;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const invoiceId = formData.get("invoiceId");
  const file = formData.get("file");
  if (typeof invoiceId !== "string" || !SAFE_ID.test(invoiceId)) return NextResponse.json({ error: "Invalid invoice id." }, { status: 400 });
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Missing PDF file." }, { status: 400 });

  const path = `${user.sub}/${invoiceId}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage.from("invoice-pdfs").upload(path, buffer, { upsert: true, contentType: "application/pdf" });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data } = supabase.storage.from("invoice-pdfs").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
