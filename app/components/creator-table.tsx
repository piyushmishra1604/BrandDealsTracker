import Link from "next/link";
import { AtSign } from "lucide-react";
import { type Creator } from "@/lib/creators";
import { CreatorStatusBadge } from "./creator-status-badge";

// Shared shape for the creator directory list (WP4.3). Mirrors CampaignTable's
// structure so both directories look and behave the same way.
export function CreatorTable({ creators, emptyMessage }: { creators: Creator[]; emptyMessage: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{creators.length} creators.</caption>
        <thead className="bg-[#f5f7fb] text-xs text-[#405579]">
          <tr>
            {["Name", "Contact", "Instagram", "Category", "Status"].map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{label}</th>
            ))}
            <th scope="col" className="px-3 py-3"><span className="sr-only">Details</span></th>
          </tr>
        </thead>
        <tbody>
          {creators.length === 0 && (
            <tr><td colSpan={6} className="px-6 py-12 text-center text-[#53668e]">{emptyMessage}</td></tr>
          )}
          {creators.map((creator) => (
            <tr key={creator.id} className="border-t border-[#edf1f8] hover:bg-[#f7f9fd]">
              <td className="whitespace-nowrap px-5 py-4 font-medium">{creator.name}</td>
              <td className="px-5 py-4 text-[#53668e]">{creator.email || creator.phone || "—"}</td>
              <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">
                {creator.instagramHandle ? <span className="inline-flex items-center gap-1"><AtSign className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />{creator.instagramHandle}</span> : "—"}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">{creator.category || "—"}</td>
              <td className="whitespace-nowrap px-5 py-4"><CreatorStatusBadge status={creator.status} /></td>
              <td className="whitespace-nowrap px-3 py-4">
                <Link href={`/manager/creators/${creator.id}`} className="text-sm font-medium text-brand-600 hover:underline">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
