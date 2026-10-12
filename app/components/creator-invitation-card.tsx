"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { type Creator } from "@/lib/creators";

type InvitationView = { id: string; email: string; status: "pending" | "expired"; expiresAt: string; createdAt: string };

const dateFormat = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" });
const inputClass = "block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-[#101c40]";
const secondaryButton = "cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";

// The link is only ever shown right after it's created; the server never returns the token again.
// Delivery is manual: the manager copies the link and sends it through their own channel.
export function CreatorInvitationCard({ creator }: { creator: Creator }) {
  const [invitation, setInvitation] = useState<InvitationView | null>(null);
  const [issuedUrl, setIssuedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const visible = creator.status !== "linked" && !creator.archivedAt;

  useEffect(() => {
    if (!visible) return;
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/manager/creators/${creator.id}/invitations`);
        const body = await response.json();
        if (active && response.ok) setInvitation(body.invitation);
      } catch { /* the card still works: the manager can issue a fresh link */ }
    }
    void load();
    return () => { active = false; };
  }, [creator.id, visible]);

  if (!visible) return null;

  async function issue() {
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const response = await fetch(`/api/manager/creators/${creator.id}/invitations`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Could not create an invitation link."); return; }
      setInvitation({ ...body.invitation, status: "pending" });
      setIssuedUrl(body.url);
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  async function revoke() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/manager/creators/${creator.id}/invitations`, { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Could not cancel the invitation."); return; }
      setInvitation(null);
      setIssuedUrl(null);
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!issuedUrl) return;
    try {
      await navigator.clipboard.writeText(issuedUrl);
      setCopied(true);
    } catch { setError("Could not copy automatically. Select the link and copy it yourself."); }
  }

  const expiry = invitation ? dateFormat.format(new Date(invitation.expiresAt)) : "";

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
      <h2 className="flex items-center gap-2 text-base font-bold"><Send className="h-4 w-4" strokeWidth={2} aria-hidden="true" />Invite to CollabFlow</h2>
      {!creator.email ? (
        <p className="mt-1 text-sm text-[#53668e]">Add an email address to this creator before sending an invitation.</p>
      ) : (
        <p className="mt-1 text-sm text-[#53668e]">Send {creator.email} a link. They sign in as a creator with that email to connect. Links expire after 7 days.</p>
      )}

      {issuedUrl && (
        <div className="mt-3 space-y-2 rounded-lg border border-brand-200 bg-brand-50/60 p-3">
          <p className="text-sm font-medium">Copy this link now. It won&rsquo;t be shown again.</p>
          <input readOnly value={issuedUrl} onFocus={(event) => event.currentTarget.select()} aria-label="Invitation link" className={inputClass} />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void copy()} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      {!issuedUrl && invitation && (
        <p className="mt-3 text-sm">
          {invitation.status === "expired" ? "This link expired on " : "Invitation pending. Expires on "}
          <span className="font-semibold">{expiry}</span>.
        </p>
      )}

      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}

      {creator.email && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => void issue()} disabled={busy} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Working…" : invitation ? "Create new link" : "Create invitation link"}
          </button>
          {invitation && (
            <button type="button" onClick={() => void revoke()} disabled={busy} className={secondaryButton}>Cancel invitation</button>
          )}
        </div>
      )}
    </section>
  );
}
