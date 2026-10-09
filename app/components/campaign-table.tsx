import Link from "next/link";
import { Handshake } from "lucide-react";
import { type Campaign } from "@/lib/campaigns";
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

// Shared by the manager dashboard's "recent campaigns" panel (WP2.3) and the full
// campaign list page (WP3.3), so both present campaigns identically. Title and brand
// are grouped in one "Campaign" column (title primary, brand as a byline beneath it),
// matching the campaign detail page's header instead of splitting them into two
// equally-weighted columns.
export function CampaignTable({ campaigns, emptyMessage }: { campaigns: Campaign[]; emptyMessage: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{campaigns.length} campaigns.</caption>
        <thead className="bg-[#f5f7fb] text-xs text-[#405579]">
          <tr>
            {["Campaign", "Budget", "Creators", "Status", "Dates"].map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{label}</th>
            ))}
            <th scope="col" className="px-3 py-3"><span className="sr-only">Details</span></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.length === 0 && (
            <tr><td colSpan={6} className="px-6 py-12 text-center text-[#53668e]">{emptyMessage}</td></tr>
          )}
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="border-t border-[#edf1f8] hover:bg-[#f7f9fd]">
              <td className="px-5 py-4">
                <div className="flex items-center gap-3">
                  <CampaignThumbnail imageUrl={campaign.imageUrl} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{campaign.title}</p>
                    <p className="mt-0.5 truncate text-xs text-[#53668e]">{campaign.brand}</p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-4">{formatBudget(campaign)}</td>
              {/* Creator-to-campaign assignment doesn't exist until a later milestone — always 0 until then. */}
              <td className="whitespace-nowrap px-5 py-4">{campaign.creatorCount ?? 0}</td>
              <td className="whitespace-nowrap px-5 py-4"><CampaignStatusBadge status={campaign.status} /></td>
              <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">{formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</td>
              <td className="whitespace-nowrap px-3 py-4">
                <Link href={`/manager/campaigns/${campaign.id}`} className="text-sm font-medium text-brand-600 hover:underline">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
