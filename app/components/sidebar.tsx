"use client";

import { LayoutDashboard, Mail, FileText, User, Settings } from "lucide-react";
import { NavShell, type NavItem } from "./nav-shell";

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, tint: "text-blue-600 bg-blue-50" },
  { label: "Brand Outreach", href: "/outreach", icon: Mail, tint: "text-purple-600 bg-purple-50" },
  { label: "Invoices", href: "/invoices", icon: FileText, tint: "text-brand-600 bg-brand-50" },
  { label: "Profile", href: "/profile", icon: User, tint: "text-teal-600 bg-teal-50" },
  { label: "Settings", href: null, icon: Settings, tint: "text-orange-600 bg-orange-50" },
];

export function Sidebar() {
  return <NavShell brand="CollabFlow" navigation={navigation} />;
}
