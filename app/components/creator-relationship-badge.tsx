import { creatorRelationshipLabels, type CreatorRelationship } from "@/lib/creators";

const colors: Record<CreatorRelationship, string> = {
  external: "bg-slate-100 text-slate-700",
  managed: "bg-indigo-50 text-indigo-700",
};

export function CreatorRelationshipBadge({ relationship }: { relationship: CreatorRelationship }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${colors[relationship]}`}>
      {creatorRelationshipLabels[relationship]}
    </span>
  );
}
