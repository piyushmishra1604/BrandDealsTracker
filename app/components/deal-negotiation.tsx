"use client";

import { useEffect, useState, type FormEvent } from "react";
import { type AcceptanceStatus, type Deal } from "@/lib/deals";
import { MAX_NEGOTIATION_AMOUNT, MAX_NOTE_LENGTH } from "@/lib/assigned-deals";
import type { DealOffer } from "@/lib/assigned-deal-store";

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

const eventLabels: Record<DealOffer["event"], string> = {
  offer: "offered",
  counter: "countered",
  accept: "accepted",
  confirm: "confirmed",
  decline: "declined",
};

const negotiationBadges: Record<AcceptanceStatus, { label: string; className: string }> = {
  pending: { label: "Awaiting your response", className: "bg-amber-50 text-amber-700" },
  countered: { label: "Counter-offer sent", className: "bg-violet-50 text-violet-700" },
  accepted: { label: "Accepted, awaiting confirmation", className: "bg-blue-50 text-blue-700" },
  confirmed: { label: "Confirmed", className: "bg-emerald-50 text-emerald-700" },
  declined: { label: "Declined", className: "bg-red-50 text-red-700" },
  manual: { label: "Recorded off-platform", className: "bg-slate-100 text-slate-700" },
};

export function negotiationBadge(deal: Deal) {
  return negotiationBadges[deal.acceptanceStatus ?? "pending"];
}

type NegotiationAction =
  | { action: "accept" }
  | { action: "counter"; counterAmount: number; note: string }
  | { action: "decline"; note: string };

const button = "cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600";

export function DealNegotiation({ deal, onDealUpdated }: { deal: Deal; onDealUpdated: (deal: Deal) => void }) {
  const [offers, setOffers] = useState<DealOffer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [note, setNote] = useState("");
  const status = deal.acceptanceStatus ?? "pending";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/deals/${deal.id}/negotiation`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load the negotiation.");
        if (active) { setOffers(body.offers); setLoaded(true); setLoadError(""); }
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : "Could not load the negotiation.");
      }
    }
    void load();
    return () => { active = false; };
  }, [deal.id]);

  async function respond(body: NegotiationAction) {
    setBusy(true);
    setActionError("");
    try {
      const response = await fetch(`/api/deals/${deal.id}/negotiation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) { setActionError(result.error ?? "Could not send your response."); return; }
      onDealUpdated(result.deal);
    } catch {
      setActionError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function submitCounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(counterAmount);
    if (!counterAmount || !Number.isFinite(amount) || amount <= 0 || amount > MAX_NEGOTIATION_AMOUNT) {
      setActionError("Enter a valid counter-offer amount.");
      return;
    }
    void respond({ action: "counter", counterAmount: amount, note: note.trim() });
  }

  const badge = negotiationBadge(deal);

  return (
    <section aria-label="Negotiation" className="mb-4 rounded-xl border border-[#e5ebf5] bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold">Assigned by your manager</h4>
          <p className="text-sm text-[#53668e]">Current amount: <span className="font-semibold tabular-nums text-[#101c40]">{formatAmount(deal.amount)}</span></p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
      </div>

      {loadError && <p role="alert" className="mb-3 text-sm text-red-700">{loadError}</p>}
      {!loaded && !loadError && <p role="status" className="mb-3 text-sm text-[#53668e]">Loading negotiation…</p>}
      {loaded && offers.length > 0 && (
        <ol aria-label="Offer history" className="mb-4 space-y-2 border-l-2 border-[#edf1f8] pl-4">
          {offers.map((offer, index) => (
            <li key={`${offer.created_at}-${index}`} className="text-sm text-[#405579]">
              <span className="font-medium text-[#101c40]">{offer.actor === "manager" ? "Manager" : "You"}</span> {eventLabels[offer.event]} <span className="font-semibold tabular-nums">{formatAmount(offer.amount)}</span>
              <span className="ml-2 text-xs text-[#53668e]">{new Date(offer.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              {offer.note && <p className="mt-0.5 text-xs italic text-[#53668e]">“{offer.note}”</p>}
            </li>
          ))}
        </ol>
      )}

      {status === "pending" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => void respond({ action: "accept" })} className={`${button} bg-[#243657] text-white hover:bg-[#172846]`}>
              Accept {formatAmount(deal.amount)}
            </button>
          </div>
          <form aria-label="Send counter-offer" onSubmit={submitCounter} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
            <label className="text-xs text-[#405579]">Counter amount (₹)
              <input aria-label="Counter amount" type="number" min="1" max={MAX_NEGOTIATION_AMOUNT} step="0.01" value={counterAmount} onChange={(event) => setCounterAmount(event.target.value)} className={inputClass} />
            </label>
            <label className="text-xs text-[#405579]">Message to manager (optional)
              <input aria-label="Message to manager" maxLength={MAX_NOTE_LENGTH} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why this amount?" className={inputClass} />
            </label>
            <button type="submit" disabled={busy} className={`${button} border border-violet-200 bg-white text-violet-700 hover:bg-violet-50`}>Send counter-offer</button>
          </form>
          <div>
            <button type="button" disabled={busy} onClick={() => void respond({ action: "decline", note: note.trim() })} className={`${button} border border-red-200 bg-white text-red-600 hover:bg-red-50`}>
              Decline
            </button>
          </div>
        </div>
      )}
      {status === "countered" && <p className="text-sm text-[#405579]">Your counter-offer is with the manager. They will accept it or send a new offer.</p>}
      {status === "accepted" && <p className="text-sm text-[#405579]">You accepted {formatAmount(deal.amount)}. The manager will confirm the final amount.</p>}
      {status === "confirmed" && <p className="text-sm text-[#405579]">Confirmed at {formatAmount(deal.amount)}.</p>}
      {status === "declined" && <p className="text-sm text-[#405579]">You declined this offer. The manager can send a new one.</p>}

      {actionError && <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}
    </section>
  );
}
