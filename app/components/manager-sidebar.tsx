"use client";

import { LayoutDashboard, Megaphone, Users, Mail, FileText, BarChart3, UsersRound, Settings, BadgeCheck } from "lucide-react";
import { NavShell, type NavItem } from "./nav-shell";
import { RoleSwitcher } from "./role-switcher";

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: LayoutDashboard, tint: "text-blue-600 bg-blue-50" },
  { label: "Campaigns", href: "/manager/campaigns", icon: Megaphone, tint: "text-purple-600 bg-purple-50" },
  { label: "Creators", href: "/manager/creators", icon: Users, tint: "text-teal-600 bg-teal-50" },
  { label: "Talent Management", href: "/manager/creator-management", icon: BadgeCheck, tint: "text-indigo-600 bg-indigo-50" },
  { label: "Outreach", href: null, icon: Mail, tint: "text-pink-600 bg-pink-50" },
  { label: "Invoices", href: null, icon: FileText, tint: "text-amber-600 bg-amber-50" },
  { label: "Analytics", href: null, icon: BarChart3, tint: "text-cyan-600 bg-cyan-50" },
  { label: "Team", href: null, icon: UsersRound, tint: "text-indigo-600 bg-indigo-50" },
  { label: "Settings", href: "/manager/settings", icon: Settings, tint: "text-orange-600 bg-orange-50" },
];

export function ManagerSidebar({ workspaceName }: { workspaceName: string }) {
  return (
    <NavShell
      brand={workspaceName}
      subtitle="Manager Workspace"
      navigation={navigation}
      footerExtra={<RoleSwitcher />}
    />
  );
}
