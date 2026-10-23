"use client";

import { LayoutDashboard, Megaphone, Users, Mail, FileText, BarChart3, UsersRound, Settings, BadgeCheck } from "lucide-react";
import { NavShell, type NavItem } from "./nav-shell";
import { RoleSwitcher } from "./role-switcher";
import type { WorkspaceFocus } from "@/lib/auth/workspace";

const CAMPAIGN_ITEMS: NavItem[] = [
  { label: "Campaigns", href: "/manager/campaigns", icon: Megaphone, tint: "text-purple-600 bg-purple-50" },
  { label: "Creators", href: "/manager/creators", icon: Users, tint: "text-teal-600 bg-teal-50" },
];

const TALENT_ITEMS: NavItem[] = [
  { label: "Talent Management", href: "/manager/creator-management", icon: BadgeCheck, tint: "text-indigo-600 bg-indigo-50" },
];

const SHARED_ITEMS: NavItem[] = [
  { label: "Outreach", href: null, icon: Mail, tint: "text-pink-600 bg-pink-50" },
  { label: "Invoices", href: null, icon: FileText, tint: "text-amber-600 bg-amber-50" },
];

const CAMPAIGN_ONLY_ITEMS: NavItem[] = [
  { label: "Analytics", href: null, icon: BarChart3, tint: "text-cyan-600 bg-cyan-50" },
  { label: "Team", href: null, icon: UsersRound, tint: "text-indigo-600 bg-indigo-50" },
];

const SETTINGS_ITEM: NavItem = { label: "Settings", href: "/manager/settings", icon: Settings, tint: "text-orange-600 bg-orange-50" };

// Nav items depend on the workspace's focus setting (Settings > Workspace view):
// "talent" hides campaign/team tooling the workspace doesn't use; "campaigns" hides
// Talent Management; "full" (the default) shows everything, matching today's nav.
function navigationFor(focus: WorkspaceFocus): NavItem[] {
  const dashboard: NavItem = { label: "Dashboard", href: "/manager", icon: LayoutDashboard, tint: "text-blue-600 bg-blue-50" };
  if (focus === "talent") return [dashboard, ...TALENT_ITEMS, ...SHARED_ITEMS, SETTINGS_ITEM];
  if (focus === "campaigns") return [dashboard, ...CAMPAIGN_ITEMS, ...SHARED_ITEMS, ...CAMPAIGN_ONLY_ITEMS, SETTINGS_ITEM];
  return [dashboard, ...CAMPAIGN_ITEMS, ...TALENT_ITEMS, ...SHARED_ITEMS, ...CAMPAIGN_ONLY_ITEMS, SETTINGS_ITEM];
}

export function ManagerSidebar({ workspaceName, focus }: { workspaceName: string; focus: WorkspaceFocus }) {
  return (
    <NavShell
      brand={workspaceName}
      subtitle="Manager Workspace"
      navigation={navigationFor(focus)}
      footerExtra={<RoleSwitcher />}
    />
  );
}
