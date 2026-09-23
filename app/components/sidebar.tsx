"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Dashboard", href: "/", path: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9" },
  { label: "Brand Outreach", href: "/outreach", path: "M3 6h18v12H3V6Zm0 0 9 7 9-7" },
  { label: "Deals", href: null, path: "M3 3h8l10 10-8 8L3 11V3Zm4 4h.01" },
  { label: "Calendar", href: null, path: "M8 2v5M16 2v5M3 10h18M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Z" },
  { label: "Analytics", href: null, path: "M3 21h18M5 21V11h3v10M11 21V4h3v17M17 21V8h3v13" },
  { label: "Settings", href: null, path: "m9 3-1 3-3 1-2 4 2 2v4l4 3 3-1 3 1 4-3v-4l2-2-2-4-3-1-1-3H9Zm6 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex shrink-0 flex-col border-b border-[#edf1f8] bg-[#f7f9fd] px-4 py-5 md:w-52 md:border-r md:border-b-0 md:py-7 lg:w-56">
      <p className="mb-5 px-3 text-xl font-bold tracking-tight md:mb-8">BrandTracker</p>
      <nav aria-label="Main navigation" className="flex gap-2 overflow-x-auto pb-1 md:flex-1 md:flex-col md:overflow-visible">
        {navigation.map(({ label, href, path }) => {
          const active = href !== null && pathname === href;
          const classes = `flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${label === "Settings" ? "md:mt-auto" : ""} ${active ? "bg-[#e8efff] text-[#0655ff]" : "text-[#405579]"}`;
          const contents = <><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d={path} /></svg>{label}</>;
          return href !== null ? (
            <Link key={label} href={href} aria-current={active ? "page" : undefined} className={`${classes} focus-visible:outline-2 focus-visible:outline-blue-600`}>{contents}</Link>
          ) : (
            <button key={label} type="button" disabled title={`${label} is coming in a later milestone`} className={`${classes} cursor-not-allowed`}>{contents}<span className="sr-only"> (coming soon)</span></button>
          );
        })}
      </nav>
    </aside>
  );
}
