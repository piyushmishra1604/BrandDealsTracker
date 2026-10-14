"use client";

import { useState } from "react";
import { CloudCreators } from "./cloud-creators";
import { CreatorTable } from "./creator-table";

const formatMoney = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

// Talent Management only covers creators this agency manages; external creators live on the
// plain Creators directory instead, so there's no "all creators" view to switch to here.
export function CreatorManagementClient({ workspaceId }: { workspaceId: string }) {
  const [showArchived, setShowArchived] = useState(false);

  return (
    <div>
      <div className="mb-9 sm:mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Talent Management</h1>
        <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Creators your agency manages, with their deals across every campaign.</p>
      </div>

      <CloudCreators workspaceId={workspaceId}>
        {(creators, _save, setArchived) => {
          const managed = creators.filter(creator => creator.relationship === "managed" && !creator.archivedAt);
          const activeDeals = managed.reduce((sum, creator) => sum + (creator.activeDealCount ?? 0), 0);
          const committed = managed.reduce((sum, creator) => sum + (creator.activeDealValue ?? 0) + (creator.completedDealValue ?? 0), 0);
          const visible = creators.filter(creator => creator.relationship === "managed" && (showArchived || !creator.archivedAt));

          return (
            <>
              <section aria-label="Management summary" className="mb-7 grid gap-4 sm:grid-cols-3">
                <SummaryCard label="Managed creators" value={String(managed.length)} />
                <SummaryCard label="Active deals" value={String(activeDeals)} />
                <SummaryCard label="Committed value" value={formatMoney(committed)} />
              </section>

              <section aria-label="Filter creators" className="mb-7 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-[#53668e]">
                  <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                  Show archived
                </label>
              </section>

              <section aria-labelledby="management-heading" className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
                <div className="border-b border-[#e5ebf5] px-5 py-5">
                  <h2 id="management-heading" className="text-lg font-bold">Managed creators</h2>
                </div>
                {visible.length === 0 ? (
                  <p className="px-5 py-12 text-center text-sm text-[#53668e]">No managed creators yet. Open a linked creator and choose Make managed.</p>
                ) : (
                  <CreatorTable
                    creators={visible}
                    emptyMessage="No creators to show."
                    onSetArchived={setArchived}
                  />
                )}
              </section>
            </>
          );
        }}
      </CloudCreators>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[#53668e]">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#101c40]">{value}</p>
    </div>
  );
}
