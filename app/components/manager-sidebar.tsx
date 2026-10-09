"use client";

import { LayoutDashboard, Megaphone, Users, Handshake as DealsIcon, Settings } from "lucide-react";
import { NavShell, type NavItem } from "./nav-shell";

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/manager", icon: LayoutDashboard, tint: "text-blue-600 bg-blue-50" },
  { label: "Campaigns", href: "/manager/campaigns", icon: Megaphone, tint: "text-purple-600 bg-purple-50" },
  { label: "Creators", href: null, icon: Users, tint: "text-teal-600 bg-teal-50" },
  { label: "Deals", href: null, icon: DealsIcon, tint: "text-brand-600 bg-brand-50" },
  { label: "Settings", href: null, icon: Settings, tint: "text-orange-600 bg-orange-50" },
];

export function ManagerSidebar() {
  return <NavShell brand="BrandTracker Agency" navigation={navigation} />;
}
