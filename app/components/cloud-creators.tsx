"use client";

import { useEffect, useState, type ReactNode } from "react";
import { type Creator, type CreatorInput } from "@/lib/creators";

export function CloudCreators({ workspaceId, children }: {
  workspaceId: string;
  children: (
    creators: Creator[],
    save: (input: CreatorInput, id?: string) => Promise<string | null>,
  ) => ReactNode;
}) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/manager/creators?workspaceId=${encodeURIComponent(workspaceId)}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load creators.");
        if (active) { setCreators(body.creators); setLoaded(true); setError(""); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load creators. Check your connection and try again.");
      }
    }
    void load();
    return () => { active = false; };
  }, [workspaceId, retry]);

  async function save(input: CreatorInput, id?: string) {
    try {
      const response = id
        ? await fetch(`/api/manager/creators/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
        : await fetch("/api/manager/creators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, ...input }) });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not save the creator.";
      setCreators(current => [body.creator, ...current.filter(entry => entry.id !== body.creator.id)]);
      return null;
    } catch { return "Could not save to the server. Check your connection and try again."; }
  }

  const button = "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50";
  return <>
    {error && <div role="alert" className="p-6 text-red-700">{error} <button className={button} onClick={() => setRetry(value => value + 1)}>Retry loading</button></div>}
    {loaded ? children(creators, save) : !error && <p role="status" className="p-8">Loading creators…</p>}
  </>;
}
