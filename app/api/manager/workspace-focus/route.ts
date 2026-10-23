import { NextResponse } from "next/server";
import { requireWorkspaceAccess, type WorkspaceFocus } from "@/lib/auth/workspace";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const VALID_FOCUS: WorkspaceFocus[] = ["full", "campaigns", "talent"];

export async function PATCH(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const { workspaceId, focus } = (body ?? {}) as { workspaceId?: unknown; focus?: unknown };
  if (typeof workspaceId !== "string" || !workspaceId) return NextResponse.json({ error: "Missing workspace." }, { status: 400 });
  if (typeof focus !== "string" || !VALID_FOCUS.includes(focus as WorkspaceFocus)) {
    return NextResponse.json({ error: "Choose Everything, Campaigns only, or Talent Management only." }, { status: 400 });
  }

  // Only the owner changes what the whole agency sees, so every member is affected consistently.
  const access = await requireWorkspaceAccess(workspaceId, "owner");
  if (!access) return NextResponse.json({ error: "Only the workspace owner can change this." }, { status: 403 });

  const { error } = await getSupabaseAdmin().from("workspaces").update({ focus }).eq("id", workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ focus });
}
