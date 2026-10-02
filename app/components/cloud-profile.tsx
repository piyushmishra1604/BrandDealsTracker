"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { type Profile, defaultProfileId, isProfile } from "@/lib/profile";

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
        const { data, error } = await getSupabase().from("profile").select("*").eq("id", defaultProfileId).single();
        if (error) throw error;
        if (!isProfile(data)) throw new Error("The saved profile has an unexpected format.");
        if (active) { setProfile(data); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load your profile. Check that the profile table has been created in Supabase.");
      }
    }
    void load();
    return () => { active = false; };
  }, [retry]);

  async function save(updated: Profile) {
    try {
      const { data, error } = await getSupabase().from("profile").update(updated).eq("id", defaultProfileId).select().single();
      if (error) return error.message;
      if (!isProfile(data)) return "The database returned an unexpected result. Reload before retrying.";
      setProfile(data);
      return null;
    } catch { return "Could not save to Supabase. Check your connection and try again."; }
  }

  const button = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";
  return <>
    {error && <div role="alert" className="p-6 text-red-700">{error} <button className={button} onClick={() => setRetry(value => value + 1)}>Retry loading</button></div>}
    {profile ? children(profile, save) : !error && <p role="status" className="p-8">Loading your profile…</p>}
  </>;
}
