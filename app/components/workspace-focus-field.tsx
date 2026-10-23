"use client";

import { useState } from "react";
import { LayoutGrid, Megaphone, BadgeCheck } from "lucide-react";
import { FormSection } from "./form-section";
import type { WorkspaceFocus } from "@/lib/auth/workspace";
const OPTIONS: { value: WorkspaceFocus; label: string; description: string; icon: typeof LayoutGrid }[] = [
  { value: "full", label: "Everything", description: "Run brand campaigns and manage your creator roster.", icon: LayoutGrid },
  { value: "campaigns", label: "Campaigns only", description: "Run brand campaigns. Hides Talent Management.", icon: Megaphone },
  { value: "talent", label: "Talent Management only", description: "Manage creators and their deals directly. Hides Campaigns.", icon: BadgeCheck },
];

// Changes what the whole agency workspace sees in the manager nav and dashboard.
// Only the workspace owner can change it (enforced server-side too).
export function WorkspaceFocusField({ workspaceId, initialFocus, isOwner }: { workspaceId: string; initialFocus: WorkspaceFocus; isOwner: boolean }) {
  const [focus, setFocus] = useState(initialFocus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function choose(value: WorkspaceFocus) {
    if (value === focus || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/manager/workspace-focus", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, focus: value }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "Could not save this setting."); return; }
      setFocus(value);
      // Nav items and route guards are read on the server, so a reload is the simplest way
      // to reflect the new focus everywhere without duplicating that logic on the client.
      window.location.href = "/manager";
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <FormSection icon={LayoutGrid} title="Workspace view" description="Choose what your agency workspace shows in the manager portal.">
      <div role="radiogroup" aria-label="Workspace view" className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, description, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={focus === value}
            disabled={!isOwner || saving}
            onClick={() => void choose(value)}
            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focus === value ? "border-[#243657] bg-[#243657] text-white" : "border-slate-200 bg-white text-[#405579] hover:bg-slate-50"}`}
          >
            <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            <span className="text-sm font-semibold">{label}</span>
            <span className={`text-xs ${focus === value ? "text-white/80" : "text-[#53668e]"}`}>{description}</span>
          </button>
        ))}
      </div>
      {!isOwner && <p className="mt-3 text-xs text-[#53668e]">Only the workspace owner can change this.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </FormSection>
  );
}
