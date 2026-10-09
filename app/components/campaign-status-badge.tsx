import { campaignStatusLabels, type CampaignStatus } from "@/lib/campaigns";

const colors: Record<CampaignStatus, string> = {
  draft: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-orange-50 text-orange-700",
  completed: "bg-brand-50 text-brand-600",
  archived: "bg-slate-100 text-slate-600",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${colors[status]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {campaignStatusLabels[status]}
    </span>
  );
}
