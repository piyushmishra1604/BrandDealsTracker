import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isCreatorInput, type Creator, type CreatorInput, type CreatorSummary } from "@/lib/creators";

function countByCreator(rows: { creatorId: string }[] | null) {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) counts.set(row.creatorId, (counts.get(row.creatorId) ?? 0) + 1);
  return counts;
}

// Archived creators are included so the directory can show them behind a toggle.
export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId") ?? "";
  const access = await requireWorkspaceAccess(workspaceId);
  if (!access) return NextResponse.json({ error: "Not signed in, or you don't have access to this workspace." }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("creators")
    .select("*")
    .eq("workspaceId", workspaceId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const creators = (data ?? []) as Creator[];
  const ids = creators.map(creator => creator.id);
  if (ids.length === 0) return NextResponse.json({ creators: [] as CreatorSummary[] });

  const [campaignLinks, deals] = await Promise.all([
    supabase.from("campaign_creators").select("creatorId").in("creatorId", ids),
    supabase.from("deals").select("creatorId").in("creatorId", ids),
  ]);
  if (campaignLinks.error || deals.error) return NextResponse.json({ error: (campaignLinks.error ?? deals.error)?.message }, { status: 500 });

  const campaignCounts = countByCreator(campaignLinks.data as { creatorId: string }[] | null);
  const dealCounts = countByCreator(deals.data as { creatorId: string }[] | null);
  const summaries: CreatorSummary[] = creators.map(creator => ({
    ...creator,
    campaignCount: campaignCounts.get(creator.id) ?? 0,
    dealCount: dealCounts.get(creator.id) ?? 0,
  }));
  return NextResponse.json({ creators: summaries });
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { workspaceId, ...creatorFields } = (body ?? {}) as { workspaceId?: unknown } & Partial<CreatorInput>;

  if (typeof workspaceId !== "string" || !workspaceId) return NextResponse.json({ error: "Missing workspace." }, { status: 400 });
  const access = await requireWorkspaceAccess(workspaceId);
  if (!access) return NextResponse.json({ error: "Not signed in, or you don't have access to this workspace." }, { status: 401 });

  if (!isCreatorInput(creatorFields)) return NextResponse.json({ error: "Invalid creator data." }, { status: 400 });

  // Pick only contact fields so a client can't set linkedUserId, relationship, or archivedAt directly.
  const { name, email, phone, instagramHandle, category, notes } = creatorFields;
  const { data, error } = await getSupabaseAdmin()
    .from("creators")
    .insert({ name, email: email || null, phone: phone || null, instagramHandle: instagramHandle || null, category: category || null, notes: notes || null, workspaceId, createdBy: access.sub })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ creator: data as Creator });
}
