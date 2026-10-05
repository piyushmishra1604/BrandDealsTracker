"use client";

import { useEffect, useState, type ReactNode } from "react";
import { type Profile, isProfile } from "@/lib/profile";

export function CloudProfile({ children }: {
  children: (profile: Profile, save: (profile: Profile) => Promise<string | null>) => ReactNode;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/profile");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load your profile.");
        if (!isProfile(body.profile)) throw new Error("The saved profile has an unexpected format.");
        if (active) { setProfile(body.profile); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load your profile. Check your connection and try again.");
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function save(updated: Profile) {
    try {
      const response = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not save your profile.";
      if (!isProfile(body.profile)) return "The database returned an unexpected result. Reload before retrying.";
      setProfile(body.profile);
      return null;
    } catch { return "Could not save to the server. Check your connection and try again."; }
  }

  const button = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";
  return <>
    {error && <div role="alert" className="p-6 text-red-700">{error} <button className={button} onClick={() => setRetry(value => value + 1)}>Retry loading</button></div>}
    {profile ? children(profile, save) : !error && <p role="status" className="p-8">Loading your profile…</p>}
  </>;
}
