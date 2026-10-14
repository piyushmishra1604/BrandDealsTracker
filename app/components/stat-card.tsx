// Shared stat tile used by the creator dashboard and anywhere else a quick deal summary
// (total deals, money received, etc.) needs to look the same.
export function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
      <p className="text-xs font-medium uppercase tracking-wide text-[#53668e]">{title}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#101c40]">{value}</p>
    </div>
  );
}
