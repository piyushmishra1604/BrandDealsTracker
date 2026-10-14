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
  draft: { label: "Created, not yet sent", className: "bg-sky-50 text-sky-700" },
  pending: { label: "Awaiting your response", className: "bg-amber-50 text-amber-700" },
  countered: { label: "Counter-offer sent", className: "bg-violet-50 text-violet-700" },
  accepted: { label: "Accepted, awaiting confirmation", className: "bg-blue-50 text-blue-700" },
  confirmed: { label: "Accepted", className: "bg-emerald-50 text-emerald-700" },
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
  const { offers, loaded, loadError } = useNegotiationOffers(deal.id);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  const [note, setNote] = useState("");
  const [showCounter, setShowCounter] = useState(false);
  const status = deal.acceptanceStatus ?? "pending";
  const latestOffer = offers.at(-1);

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
      {loaded && latestOffer && (
        <div className="mb-4 rounded-lg bg-[#f5f7fb] px-3 py-3 text-sm text-[#405579]">
          <p>
            <span className="font-medium text-[#101c40]">{latestOffer.actor === "manager" ? "Manager" : "You"}</span> {eventLabels[latestOffer.event]} <span className="font-semibold tabular-nums">{formatAmount(latestOffer.amount)}</span>
            <span className="ml-2 text-xs text-[#53668e]">{new Date(latestOffer.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          </p>
          {latestOffer.note && <p className="mt-1 text-xs italic text-[#53668e]">“{latestOffer.note}”</p>}
        </div>
      )}

      {status === "pending" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => void respond({ action: "accept" })} className={`${button} bg-[#243657] text-white hover:bg-[#172846]`}>
              Accept offer
            </button>
            <button type="button" disabled={busy} onClick={() => void respond({ action: "decline", note: "" })} className={`${button} border border-red-200 bg-white text-red-600 hover:bg-red-50`}>
              Decline
            </button>
            <button type="button" disabled={busy} aria-expanded={showCounter} onClick={() => setShowCounter(current => !current)} className={`${button} border border-violet-200 bg-white text-violet-700 hover:bg-violet-50`}>
              Send counter offer
            </button>
          </div>
          {showCounter && (
            <form aria-label="Send counter-offer" onSubmit={submitCounter} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
              <label className="text-xs text-[#405579]">Counter amount (₹)
                <input aria-label="Counter amount" type="number" min="1" max={MAX_NEGOTIATION_AMOUNT} step="0.01" value={counterAmount} onChange={(event) => setCounterAmount(event.target.value)} className={inputClass} />
              </label>
              <label className="text-xs text-[#405579]">Message to manager (optional)
                <input aria-label="Message to manager" maxLength={MAX_NOTE_LENGTH} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Why this amount?" className={inputClass} />
              </label>
              <button type="submit" disabled={busy} className={`${button} bg-violet-700 text-white hover:bg-violet-800`}>Send</button>
            </form>
          )}
        </div>
      )}
      {status === "countered" && <p className="text-sm text-[#405579]">Your counter-offer is with the manager. They will accept it or send a new offer.</p>}
      {status === "accepted" && <p className="text-sm text-[#405579]">You accepted {formatAmount(deal.amount)}. The manager will confirm the final amount.</p>}
      {status === "confirmed" && <p className="text-sm text-[#405579]">Accepted at {formatAmount(deal.amount)}.</p>}
      {status === "declined" && <p className="text-sm text-[#405579]">You declined this offer. The manager can send a new one.</p>}

      {actionError && <p role="alert" className="mt-3 text-sm text-red-700">{actionError}</p>}
    </section>
  );
}

function useNegotiationOffers(dealId: string) {
  const [offers, setOffers] = useState<DealOffer[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/deals/${dealId}/negotiation`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load the negotiation history.");
        if (active) { setOffers(body.offers); setLoaded(true); setLoadError(""); }
      } catch (err) {
        if (active) setLoadError(err instanceof Error ? err.message : "Could not load the negotiation history.");
      }
    }
    void load();
    return () => { active = false; };
  }, [dealId]);

  return { offers, loaded, loadError };
}

function OfferLine({ offer }: { offer: DealOffer }) {
  return (
    <li className="text-sm text-[#405579]">
      <span className="font-medium text-[#101c40]">{offer.actor === "manager" ? "Manager" : "You"}</span> {eventLabels[offer.event]} <span className="font-semibold tabular-nums">{formatAmount(offer.amount)}</span>
      <span className="ml-2 text-xs text-[#53668e]">{new Date(offer.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
      {offer.note && <p className="mt-0.5 text-xs italic text-[#53668e]">“{offer.note}”</p>}
    </li>
  );
}

export function NegotiationHistory({ deal }: { deal: Deal }) {
  const { offers, loaded, loadError } = useNegotiationOffers(deal.id);
  const [showAll, setShowAll] = useState(false);
  const recent = offers.slice(-2).reverse();

  useEffect(() => {
    if (!showAll) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowAll(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showAll]);

  return (
    <section aria-label="Negotiation history" className="rounded-xl border border-[#e5ebf5] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-semibold">Negotiation history</h4>
        {offers.length > 2 && <button type="button" onClick={() => setShowAll(true)} className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">View all</button>}
      </div>
      {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
      {!loaded && !loadError && <p role="status" className="text-sm text-[#53668e]">Loading…</p>}
      {loaded && recent.length === 0 && <p className="py-2 text-sm text-[#53668e]">No negotiation activity yet.</p>}
      {recent.length > 0 && <ol className="space-y-3 border-l-2 border-[#edf1f8] pl-4">
        {recent.map((offer, index) => <OfferLine key={`${offer.created_at}-${index}`} offer={offer} />)}
      </ol>}

      {showAll && (
        <div role="presentation" onClick={() => setShowAll(false)} className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4 sm:p-8">
          <div role="dialog" aria-modal="true" aria-label="All negotiation history" onClick={(event) => event.stopPropagation()} className="mx-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl sm:p-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Negotiation history</h2>
                <p className="mt-1 text-sm text-[#53668e]">{deal.brand}</p>
              </div>
              <button type="button" onClick={() => setShowAll(false)} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">Close</button>
            </div>
            <ol className="space-y-3 border-l-2 border-[#edf1f8] pl-4">
              {[...offers].reverse().map((offer, index) => <OfferLine key={`${offer.created_at}-${index}`} offer={offer} />)}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}

