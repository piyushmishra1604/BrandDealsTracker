import { creatorStatusLabels, type CreatorStatus } from "@/lib/creators";

const colors: Record<CreatorStatus, string> = {
  contact: "bg-amber-50 text-amber-700",
  linked: "bg-emerald-50 text-emerald-700",
};

export function CreatorStatusBadge({ status }: { status: CreatorStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${colors[status]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {creatorStatusLabels[status]}
    </span>
  );
}
