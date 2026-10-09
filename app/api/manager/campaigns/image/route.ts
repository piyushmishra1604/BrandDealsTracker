import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  let formData: FormData;
  try { formData = await request.formData(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const workspaceId = formData.get("workspaceId");
  const file = formData.get("file");
  if (typeof workspaceId !== "string" || !workspaceId) return NextResponse.json({ error: "Missing workspace." }, { status: 400 });

  const access = await requireWorkspaceAccess(workspaceId);
  if (!access) return NextResponse.json({ error: "Not signed in, or you don't have access to this workspace." }, { status: 401 });

  if (!(file instanceof Blob)) return NextResponse.json({ error: "Missing image file." }, { status: 400 });
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) return NextResponse.json({ error: "Image must be JPEG, PNG, or WebP." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });

  const path = `${workspaceId}/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const supabase = getSupabaseAdmin();
  const { error: uploadError } = await supabase.storage.from("campaign-images").upload(path, buffer, { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data } = supabase.storage.from("campaign-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
