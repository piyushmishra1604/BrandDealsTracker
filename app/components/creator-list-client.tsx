"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CloudCreators } from "./cloud-creators";
import { CreatorTable } from "./creator-table";

export function CreatorListClient({ workspaceId }: { workspaceId: string }) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div>
      <div className="mb-9 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Creators</h1>
          <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Every creator your agency works with or is tracking.</p>
        </div>
        <Link href="/manager/creators/new" className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          <Plus className="h-4 w-4" strokeWidth={2.4} /> Add Creator
        </Link>
      </div>

      <section aria-label="Search creators" className="mb-7 flex flex-wrap items-center gap-4">
        <label className="block w-full sm:w-64">
          <span className="sr-only">Search creators</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, or Instagram…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[#53668e]">
          <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Show archived
        </label>
      </section>

      <section aria-labelledby="creators-heading" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
          <h2 id="creators-heading" className="text-lg font-bold">All Creators</h2>
        </div>
        <CloudCreators workspaceId={workspaceId}>
          {(creators, _save, setArchived) => {
            const searchLower = search.trim().toLowerCase();
            const filtered = creators.filter(creator =>
              (showArchived || !creator.archivedAt) &&
              (!searchLower
                || creator.name.toLowerCase().includes(searchLower)
                || (creator.email ?? "").toLowerCase().includes(searchLower)
                || (creator.instagramHandle ?? "").toLowerCase().includes(searchLower)));
            const emptyMessage = creators.length === 0
              ? "No creators yet. Add your first creator."
              : filtered.length === 0 && !showArchived && creators.every(creator => creator.archivedAt)
                ? "All your creators are archived. Tick \"Show archived\" to see them."
                : "No creators match your search.";
            return <CreatorTable creators={filtered} emptyMessage={emptyMessage} onSetArchived={setArchived} />;
          }}
        </CloudCreators>
      </section>
    </div>
  );
}

