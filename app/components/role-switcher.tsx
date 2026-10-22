"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";

type AccountType = "creator" | "manager";

// Shown in the nav footer only when the signed-in account has both a creator and a
// manager profile, letting them swap which portal the session acts as in one click.
export function RoleSwitcher() {
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then(response => response.ok ? response.json() : { user: null })
      .then(body => { if (active) setAccountTypes(body.user?.accountTypes ?? []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (accountTypes.length < 2) return null;

  async function switchTo(role: AccountType) {
    setSwitching(true);
    try {
      const response = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (response.ok) window.location.href = role === "manager" ? "/manager" : "/";
    } finally { setSwitching(false); }
  }

  const onManagerPortal = window.location.pathname.startsWith("/manager");
  const target: AccountType = onManagerPortal ? "creator" : "manager";

  return (
    <button
      type="button"
      disabled={switching}
      onClick={() => void switchTo(target)}
      className="flex shrink-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#405579] transition-colors hover:bg-brand-50 disabled:opacity-50 md:mt-3"
    >
      <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-600">
        <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
      </span>
      {switching ? "Switching…" : `Switch to ${target === "manager" ? "Manager" : "Creator"}`}
    </button>
  );
}
