"use client";

import { AtSign, CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { normalizeUsername, validateUsername } from "@/lib/username";
import { FormSection } from "./form-section";

type Availability = { available: boolean; message: string };

const CHECK_DELAY_MS = 400;

// Self-contained so it works on both the creator profile and the manager settings page.
// It saves on its own endpoint, separate from the profile form's Save button.
export function UsernameField() {
  const [loaded, setLoaded] = useState(false);
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [value, setValue] = useState("");
  // Result of the last server check, tagged with the value it was for so stale results are never shown.
  const [remote, setRemote] = useState<{ forValue: string; result: Availability } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(response => response.ok ? response.json() : null)
      .then(body => {
        const username: string | null = body?.user?.username ?? null;
        setSavedUsername(username);
        setValue(username ?? "");
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const normalized = normalizeUsername(value);
  const formatError = normalized ? validateUsername(normalized) : null;
  const isCurrent = !!normalized && normalized === savedUsername;
  // Only names that pass the format check and aren't already saved on this account need a server check.
  const needsRemote = !!normalized && !formatError && !isCurrent;

  let availability: Availability | null = null;
  if (formatError) availability = { available: false, message: formatError };
  else if (isCurrent) availability = { available: true, message: "This is your current username." };
  else if (needsRemote && remote?.forValue === normalized) availability = remote.result;
  const checking = needsRemote && remote?.forValue !== normalized;

  useEffect(() => {
    if (!loaded || !needsRemote) return;
    // Aborting on cleanup cancels both the pending timer and any in-flight request when the value changes.
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/account/username?username=${encodeURIComponent(normalized)}`, { signal: controller.signal })
        .then(response => response.json())
        .then((body: Partial<Availability> & { error?: string }) => {
          setRemote({
            forValue: normalized,
            result: body.error
              ? { available: false, message: body.error }
              : { available: Boolean(body.available), message: body.message ?? "" },
          });
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setRemote({ forValue: normalized, result: { available: false, message: "Could not check that username. Please try again." } });
        });
    }, CHECK_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loaded, needsRemote, normalized]);

  const canSave = !!availability?.available && !isCurrent && !checking && !saving;

  async function handleSave() {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/account/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: normalized }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Could not save your username. Please try again.");
        return;
      }
      setSavedUsername(body.username);
      setValue(body.username);
      setNotice("Username saved.");
    } catch {
      setError("Could not save your username. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500";

  return (
    <FormSection icon={AtSign} title="Username" description="Your unique handle, so people on CollabFlow can find and reach you. Saved separately from your profile details.">
      <div className="grid gap-3">
        <label className="text-xs text-[#405579]">Username
          <span className="relative block">
            <input
              value={value}
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. rahul_mehta"
              disabled={!loaded}
              aria-describedby="username-status"
              aria-invalid={availability ? !availability.available : undefined}
              onChange={(event) => { setValue(event.target.value.toLowerCase()); setNotice(""); setError(""); }}
              className={inputClass}
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              {checking
                ? <span className="text-xs text-[#53668e]" aria-hidden="true">…</span>
                : availability?.available
                  ? <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-600" strokeWidth={2.2} />
                  : availability
                    ? <XCircle aria-hidden="true" className="h-5 w-5 text-red-600" strokeWidth={2.2} />
                    : null}
            </span>
          </span>
        </label>

        <p id="username-status" role="status" className={`text-xs ${availability && !checking ? (availability.available ? "text-emerald-700" : "text-red-700") : "text-[#53668e]"}`}>
          {checking ? "Checking availability…" : availability ? availability.message : "3–30 characters: lowercase letters, numbers, and underscores."}
        </p>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <button type="button" disabled={!canSave} onClick={() => void handleSave()} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving…" : "Save Username"}
          </button>
          {notice && <p className="text-sm text-emerald-700">{notice}</p>}
        </div>
      </div>
    </FormSection>
  );
}
