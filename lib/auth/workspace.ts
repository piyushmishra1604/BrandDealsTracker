import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { requireManagerAccount } from "./account";
import type { SessionPayload } from "./jwt";

export type WorkspaceRole = "owner" | "manager" | "member";
export type WorkspaceFocus = "full" | "campaigns" | "talent";

const ROLE_RANK: Record<WorkspaceRole, number> = { member: 0, manager: 1, owner: 2 };

function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return value === "owner" || value === "manager" || value === "member";
}

function isWorkspaceFocus(value: unknown): value is WorkspaceFocus {
  return value === "full" || value === "campaigns" || value === "talent";
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
): Promise<(Omit<SessionPayload, "role"> & { role: WorkspaceRole }) | null> {
  if (!workspaceId) return null;
  const user = await requireManagerAccount();
  if (!user) return null;
  const role = await getWorkspaceRole(user.sub, workspaceId);
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) return null;
  return { ...user, role };
}

// Convenience for M1, where a manager has exactly one agency workspace (created at signup).
// Later milestones' workspace switcher will let a manager pick among several.
export async function getPrimaryWorkspace(userId: string): Promise<{ id: string; name: string; role: WorkspaceRole; focus: WorkspaceFocus } | null> {
  const { data } = await getSupabaseAdmin()
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name, focus)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data || !isWorkspaceRole(data.role)) return null;
  const workspace = Array.isArray(data.workspaces) ? data.workspaces[0] : data.workspaces;
  if (!workspace?.name) return null;
  return { id: data.workspace_id, name: workspace.name, role: data.role, focus: isWorkspaceFocus(workspace.focus) ? workspace.focus : "full" };
}

// Shared server-side guard for every manager page (app/manager/**): re-verifies the
// active session role and workspace membership on each page render, per Next.js's own
// guidance that layouts alone aren't re-invoked on client navigation. Pages whose content
// doesn't apply to the workspace's current focus (e.g. Campaigns while focus is "talent")
// pass requiredFocus and get redirected to the dashboard instead of rendering.
export async function requireManagerWorkspace(requiredFocus?: WorkspaceFocus[]): Promise<{ user: SessionPayload; workspace: { id: string; name: string; role: WorkspaceRole; focus: WorkspaceFocus } }> {
  const user = await requireManagerAccount();
  if (!user) redirect("/");
  const workspace = await getPrimaryWorkspace(user.sub);
  if (!workspace) redirect("/manager");
  if (requiredFocus && workspace.focus !== "full" && !requiredFocus.includes(workspace.focus)) redirect("/manager");
  return { user, workspace };
}
