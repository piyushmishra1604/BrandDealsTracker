"use client";

import { type LucideIcon, LogOut, Handshake } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { label: string; href: string | null; icon: LucideIcon; tint: string };

// Shared by the creator Sidebar and the manager nav shell so both portals look and
// behave the same way without duplicating the markup/logic (WP1.6).
export function NavShell({ brand, subtitle, navigation, footerExtra }: {
  brand: string;
  subtitle?: string;
  navigation: NavItem[];
  footerExtra?: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <aside className="flex shrink-0 flex-col border-b border-[#edf1f8] bg-[#f7f9fd] px-4 py-5 md:w-52 md:border-r md:border-b-0 md:py-7 lg:w-56">
      <div className="mb-5 flex items-center gap-2.5 px-3 md:mb-8">
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-sm">
          <Handshake className="h-4 w-4" strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xl font-bold leading-tight tracking-tight">{brand}</span>
          {subtitle && <span className="block truncate text-xs font-normal leading-tight text-[#53668e]">{subtitle}</span>}
        </span>
      </div>
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
      {footerExtra}
      <button type="button" onClick={() => void fetch("/api/auth/logout", { method: "POST" }).then(() => { window.location.reload(); })} className="mt-5 flex shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#405579] transition-colors hover:bg-brand-50 md:mt-3">
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-600"><LogOut className="h-4 w-4" strokeWidth={2} /></span>
        Sign Out
      </button>
    </aside>
  );
}
