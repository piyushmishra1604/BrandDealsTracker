import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isCreatorInput, type Creator, type CreatorInput } from "@/lib/creators";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  const access = await requireWorkspaceAccess(workspaceId);
  if (!access) return NextResponse.json({ error: "Not signed in, or you don't have access to this workspace." }, { status: 401 });

  const { data, error } = await getSupabaseAdmin()
    .from("creators")
    .select("*")
    .eq("workspaceId", workspaceId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creators: data as Creator[] });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { workspaceId, ...creatorFields } = (body ?? {}) as { workspaceId?: unknown } & Partial<CreatorInput>;

  if (typeof workspaceId !== "string" || !workspaceId) return NextResponse.json({ error: "Missing workspace." }, { status: 400 });
  const access = await requireWorkspaceAccess(workspaceId);
  if (!access) return NextResponse.json({ error: "Not signed in, or you don't have access to this workspace." }, { status: 401 });

  if (!isCreatorInput(creatorFields)) return NextResponse.json({ error: "Invalid creator data." }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("creators")
    .insert({ ...creatorFields, workspaceId, createdBy: access.sub })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creator: data as Creator });
}
