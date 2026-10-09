"use client";

import Link from "next/link";
import { LayoutDashboard, Megaphone, Users, Handshake as DealsIcon, Mail, FileText, BarChart3, UsersRound, Settings, UserPlus } from "lucide-react";
import { NavShell, type NavItem } from "./nav-shell";

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: LayoutDashboard, tint: "text-blue-600 bg-blue-50" },
  { label: "Campaigns", href: "/manager/campaigns", icon: Megaphone, tint: "text-purple-600 bg-purple-50" },
  { label: "Creators", href: "/manager/creators", icon: Users, tint: "text-teal-600 bg-teal-50" },
  { label: "Deals", href: null, icon: DealsIcon, tint: "text-brand-600 bg-brand-50" },
  { label: "Outreach", href: null, icon: Mail, tint: "text-pink-600 bg-pink-50" },
  { label: "Invoices", href: null, icon: FileText, tint: "text-amber-600 bg-amber-50" },
  { label: "Analytics", href: null, icon: BarChart3, tint: "text-cyan-600 bg-cyan-50" },
  { label: "Team", href: null, icon: UsersRound, tint: "text-indigo-600 bg-indigo-50" },
  { label: "Settings", href: null, icon: Settings, tint: "text-orange-600 bg-orange-50" },
];

export function ManagerSidebar({ workspaceName }: { workspaceName: string }) {
  return (
    <NavShell
      brand={workspaceName}
      subtitle="Manager Workspace"
      navigation={navigation}
      footerExtra={
        <Link href="/manager/creators/new" className="mt-3 block shrink-0 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-3 text-xs transition-colors hover:bg-brand-50">
          <span className="flex items-center gap-2 font-semibold text-brand-700"><UserPlus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />Invite Creators</span>
          <span className="mt-1 block text-[#53668e]">Add creators to your workspace</span>
        </Link>
      }
    />
  );
}
