"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Handshake } from "lucide-react";
import { type Campaign, type CampaignStatus } from "@/lib/campaigns";
import { currencySymbols } from "@/lib/invoices";
import { CampaignStatusBadge } from "./campaign-status-badge";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function formatBudget(campaign: Pick<Campaign, "budget" | "currency">) {
  return `${currencySymbols[campaign.currency]}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(campaign.budget)}`;
}

function CampaignThumbnail({ imageUrl }: { imageUrl?: string | null }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset
    return <img src={imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />;
  }
  return (
    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-50 to-accent-50 text-brand-300">
      <Handshake className="h-5 w-5" strokeWidth={1.5} />
    </span>
  );
}

// Same corner-flag treatment as the creator dashboard's deal rows, so both tables
// read the same way at a glance.
const cornerColors: Record<CampaignStatus, string> = {
  draft: "#eab308",
  active: "#22c55e",
  paused: "#f97316",
  completed: "#4f46e5",
  archived: "#94a3b8",
};

function StatusCorner({ status }: { status: CampaignStatus }) {
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-0 h-0 w-0 border-r-[14px] border-t-[14px] border-r-transparent"
      style={{ borderTopColor: cornerColors[status] }}
    />
  );
}

function CampaignActions({ campaign, onArchive }: { campaign: Campaign; onArchive?: (campaign: Campaign) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  return (
    <>
      <button
        type="button"
        aria-label={`Actions for ${campaign.title}`}
        aria-expanded={open}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({
            top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 108)),
            left: Math.max(8, Math.min(rect.right - 128, window.innerWidth - 136)),
          });
          setOpen(current => !current);
        }}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#405579] hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && <>
        <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
        <div aria-label={`Actions for ${campaign.title}`} style={position} className="fixed z-50 m-0 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <button type="button" onClick={() => { setOpen(false); router.push(`/manager/campaigns/${campaign.id}`); }} className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[#101c40] hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600">
            View
          </button>
          {onArchive && campaign.status !== "archived" && (
            <button type="button" onClick={() => { setOpen(false); onArchive(campaign); }} className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600">
              Archive
            </button>
          )}
        </div>
      </>}
    </>
  );
}

// Shared by the manager dashboard's "recent campaigns" panel (WP2.3) and the full
// campaign list page (WP3.3), so both present campaigns identically. Rows are
// clickable (navigate to the detail page) and use the same corner-flag + kebab-menu
// language as the creator dashboard's deal rows, for visual consistency across portals.
export function CampaignTable({ campaigns, emptyMessage, onArchive }: { campaigns: Campaign[]; emptyMessage: string; onArchive?: (campaign: Campaign) => void }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{campaigns.length} campaigns.</caption>
        <thead className="bg-[#f5f7fb] text-xs text-[#405579]">
          <tr>
            {["Campaign", "Budget", "Creators", "Status", "Dates"].map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{label}</th>
            ))}
            <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.length === 0 && (
            <tr><td colSpan={6} className="px-6 py-12 text-center text-[#53668e]">{emptyMessage}</td></tr>
          )}
          {campaigns.map((campaign) => (
            <tr
              key={campaign.id}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("button, a, [popover]")) return;
                router.push(`/manager/campaigns/${campaign.id}`);
              }}
              className="cursor-pointer border-t border-[#edf1f8] hover:bg-[#fafbfe]"
            >
              <td className="relative px-5 py-4">
                <StatusCorner status={campaign.status} />
                <div className="flex items-center gap-3">
                  <CampaignThumbnail imageUrl={campaign.imageUrl} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{campaign.title}</p>
                    <p className="mt-0.5 truncate text-xs text-[#53668e]">{campaign.brand}</p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-4 tabular-nums">{formatBudget(campaign)}</td>
              {/* Creator-to-campaign assignment doesn't exist until a later milestone — always 0 until then. */}
              <td className="whitespace-nowrap px-5 py-4">{campaign.creatorCount ?? 0}</td>
              <td className="whitespace-nowrap px-5 py-4"><CampaignStatusBadge status={campaign.status} /></td>
              <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">{formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</td>
              <td className="px-3 py-2">
                <CampaignActions campaign={campaign} onArchive={onArchive} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
