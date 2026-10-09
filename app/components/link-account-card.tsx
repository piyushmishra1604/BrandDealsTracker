"use client";

import { useState } from "react";
import { Link2, CheckCircle2 } from "lucide-react";
import { type Creator } from "@/lib/creators";

const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500";

// Temporary stand-in for real invitations (WP4.4, deferred to last): the manager must
// already know the creator's registered email, looks it up, and explicitly confirms
// the link — no email is sent and the creator isn't asked to accept anything yet.
export function LinkAccountCard({ creator, linkedEmail, onLinked }: { creator: Creator; linkedEmail?: string | null; onLinked: (creator: Creator) => void }) {
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<{ id: string; email: string } | null>(null);
  const [looking, setLooking] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");

  async function lookup() {
    setLooking(true);
    setError("");
    setFound(null);
    try {
      const response = await fetch(`/api/manager/creators/lookup-account?email=${encodeURIComponent(email)}`);
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Could not find that account."); return; }
      setFound(body.account);
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setLooking(false); }
  }

  async function confirmLink() {
    if (!found) return;
    setLinking(true);
    setError("");
    try {
      const response = await fetch(`/api/manager/creators/${creator.id}/link`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId: found.id }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Could not link this account."); return; }
      onLinked(body.creator);
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setLinking(false); }
  }

  if (creator.status === "linked") {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Linked to a registered creator account
        </p>
        {linkedEmail && <p className="mt-1 text-sm text-emerald-700/80">{linkedEmail}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
      <h2 className="flex items-center gap-2 text-base font-bold"><Link2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />Link to account</h2>
      <p className="mt-1 text-sm text-[#53668e]">This creator isn&rsquo;t linked to a registered account yet. Enter their registered email to link them — invitations are coming in a later milestone.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setFound(null); }} placeholder="creator@example.com" className={`${inputClass} max-w-xs`} />
        <button type="button" onClick={() => void lookup()} disabled={looking || !email} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
          {looking ? "Looking up…" : "Look up"}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
      {found && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-200 bg-brand-50/60 p-3">
          <p className="text-sm">Found account: <span className="font-semibold">{found.email}</span></p>
          <button type="button" onClick={() => void confirmLink()} disabled={linking} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {linking ? "Linking…" : "Confirm Link"}
          </button>
        </div>
      )}
    </section>
  );
}
