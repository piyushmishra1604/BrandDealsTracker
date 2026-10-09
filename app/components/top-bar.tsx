"use client";

import { Bell, ChevronDown, Search } from "lucide-react";

export function TopBar({ userName, userRole, searchPlaceholder }: { userName: string; userRole: string; searchPlaceholder: string }) {
  const initial = userName.trim().charAt(0).toUpperCase() || "?";
  return (
    <header className="flex items-center gap-3 border-b border-[#edf1f8] bg-white px-4 py-3 sm:gap-4 sm:px-6">
      <label className="relative max-w-md flex-1">
        <span className="sr-only">Search</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9bc2]" strokeWidth={2} />
        <input
          type="search"
          placeholder={searchPlaceholder}
          className="w-full rounded-lg border border-slate-200 bg-[#f7f9fd] py-2 pl-9 pr-3 text-sm transition-colors focus:border-brand-400 focus:bg-white focus:outline-2 focus:outline-brand-500"
        />
      </label>

      <button type="button" aria-label="Notifications" className="relative shrink-0 cursor-pointer rounded-lg p-2 text-[#53668e] hover:bg-[#f7f9fd]">
        <Bell className="h-5 w-5" strokeWidth={2} />
        <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
      </button>

      <button type="button" className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#f7f9fd]">
        <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-600 text-sm font-semibold text-white">
          {initial}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold leading-tight">{userName}</span>
          <span className="block text-xs leading-tight text-[#53668e]">{userRole}</span>
        </span>
        <ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-[#8a9bc2] sm:block" strokeWidth={2} />
      </button>
    </header>
  );
}
