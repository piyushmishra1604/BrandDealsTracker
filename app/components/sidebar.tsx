"use client";

import { LayoutDashboard, Mail, FileText, User, Settings, LogOut, Handshake } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, tint: "text-blue-600 bg-blue-50" },
  { label: "Brand Outreach", href: "/outreach", icon: Mail, tint: "text-purple-600 bg-purple-50" },
  { label: "Invoices", href: "/invoices", icon: FileText, tint: "text-brand-600 bg-brand-50" },
  { label: "Profile", href: "/profile", icon: User, tint: "text-teal-600 bg-teal-50" },
  { label: "Settings", href: null, icon: Settings, tint: "text-orange-600 bg-orange-50" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex shrink-0 flex-col border-b border-[#edf1f8] bg-[#f7f9fd] px-4 py-5 md:w-52 md:border-r md:border-b-0 md:py-7 lg:w-56">
      <p className="mb-5 flex items-center gap-2.5 px-3 text-xl font-bold tracking-tight md:mb-8">
        <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-sm">
          <Handshake className="h-4 w-4" strokeWidth={2.2} />
        </span>
        BrandTracker
      </p>
      <nav aria-label="Main navigation" className="flex gap-2 overflow-x-auto pb-1 md:flex-1 md:flex-col md:overflow-visible">
        {navigation.map(({ label, href, icon: Icon, tint }) => {
          const active = href !== null && (pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)));
          const classes = `flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${label === "Settings" ? "md:mt-auto" : ""} ${active ? "bg-brand-50 text-brand-600" : "text-[#405579] hover:bg-brand-50/60"}`;
          const contents = <><span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tint}`}><Icon className="h-4 w-4" strokeWidth={2} /></span>{label}</>;
          return href !== null ? (
            <Link key={label} href={href} aria-current={active ? "page" : undefined} className={`${classes} focus-visible:outline-2 focus-visible:outline-brand-600`}>{contents}</Link>
          ) : (
            <button key={label} type="button" disabled title={`${label} is coming in a later milestone`} className={`${classes} cursor-not-allowed`}>{contents}<span className="sr-only"> (coming soon)</span></button>
          );
        })}
      </nav>
      <button type="button" onClick={() => void fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.reload(); })} className="mt-5 flex shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#405579] transition-colors hover:bg-brand-50 md:mt-3">
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600"><LogOut className="h-4 w-4" strokeWidth={2} /></span>
        Sign Out
      </button>
    </aside>
  );
}
