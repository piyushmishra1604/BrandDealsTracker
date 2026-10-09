import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { requireManagerAccount, getAccountType } from "./account";
import { getCurrentUser } from "./session";
import type { SessionPayload } from "./jwt";

export type WorkspaceRole = "owner" | "manager" | "member";

const ROLE_RANK: Record<WorkspaceRole, number> = { member: 0, manager: 1, owner: 2 };

function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === "owner" || value === "manager" || value === "member";
}

export async function getWorkspaceRole(userId: string, workspaceId: string): Promise<WorkspaceRole | null> {
  const { data } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return isWorkspaceRole(data?.role) ? data.role : null;
}

// The server always re-derives the caller's role for the claimed workspace from
// workspace_members; a workspace_id supplied by the client is never trusted on its own.
export async function requireWorkspaceAccess(
  workspaceId: string,
  minRole: WorkspaceRole = "member",
): Promise<(SessionPayload & { role: WorkspaceRole }) | null> {
  if (!workspaceId) return null;
  const user = await requireManagerAccount();
  if (!user) return null;
  const role = await getWorkspaceRole(user.sub, workspaceId);
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) return null;
  return { ...user, role };
}

// Convenience for M1, where a manager has exactly one agency workspace (created at signup).
// Later milestones' workspace switcher will let a manager pick among several.
export async function getPrimaryWorkspace(userId: string): Promise<{ id: string; name: string; role: WorkspaceRole } | null> {
  const { data } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data || !isWorkspaceRole(data.role)) return null;
  const workspace = Array.isArray(data.workspaces) ? data.workspaces[0] : data.workspaces;
  if (!workspace?.name) return null;
  return { id: data.workspace_id, name: workspace.name, role: data.role };
}

// Shared server-side guard for every manager page (app/manager/**): re-verifies
// account_type and workspace membership on each page render, per Next.js's own
// guidance that layouts alone aren't re-invoked on client navigation.
export async function requireManagerWorkspace(): Promise<{ user: SessionPayload; workspace: { id: string; name: string; role: WorkspaceRole } }> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  const accountType = await getAccountType(user.sub);
  if (accountType !== "manager") redirect("/");
  const workspace = await getPrimaryWorkspace(user.sub);
  if (!workspace) redirect("/manager");
  return { user, workspace };
}
