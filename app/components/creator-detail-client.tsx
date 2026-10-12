"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, AtSign } from "lucide-react";
import { type Creator, type CreatorInput, type CreatorRelationship } from "@/lib/creators";
import { CreatorStatusBadge } from "./creator-status-badge";
import { CreatorRelationshipBadge } from "./creator-relationship-badge";
import { CreatorForm } from "./creator-form";
import { LinkAccountCard } from "./link-account-card";
import { CreatorInvitationCard } from "./creator-invitation-card";
import { CreatorDealDashboard } from "./creator-deal-dashboard";

export function CreatorDetailClient({ creator: initialCreator }: { creator: Creator }) {
  const [creator, setCreator] = useState(initialCreator);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  async function setArchived(archived: boolean) {
    setNotice("");
    try {
      const response = await fetch(`/api/manager/creators/${creator.id}/archive`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ archived }) });
      const body = await response.json();
      if (!response.ok) { setNotice(body.error ?? "Could not update the creator."); return; }
      setCreator(body.creator);
      setNotice(archived ? "Creator archived. They are hidden from new assignments." : "Creator restored.");
    } catch { setNotice("Could not reach the server. Check your connection and try again."); }
  }

  async function setRelationship(relationship: CreatorRelationship) {
    setNotice("");
    try {
      const response = await fetch(`/api/manager/creators/${creator.id}/relationship`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ relationship }) });
      const body = await response.json();
      if (!response.ok) { setNotice(body.error ?? "Could not change the relationship."); return; }
      setCreator(body.creator);
      setNotice(relationship === "managed" ? "Creator is now managed. They appear in Talent Management." : "Creator is now external. Their deal history is unchanged.");
    } catch { setNotice("Could not reach the server. Check your connection and try again."); }
  }

  async function save(input: CreatorInput) {
    try {
      const response = await fetch(`/api/manager/creators/${creator.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not save the creator.";
      setCreator(body.creator);
      setEditing(false);
      setNotice("Creator updated.");
      return null;
    } catch { return "Could not reach the server. Check your connection and try again."; }
  }

  const promoteBlockedReason = !creator.linkedUserId
    ? "Link a CollabFlow account first. Managed creators need one."
    : creator.archivedAt ? "Restore this creator before making them managed." : "";

  return (
    <div>
      <Link href="/manager/creators" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#53668e] hover:text-[#101c40]">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to Creators
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{creator.name}</h1>
          <CreatorStatusBadge status={creator.status} />
          <CreatorRelationshipBadge relationship={creator.relationship} />
          {creator.archivedAt && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">Archived</span>}
        </div>
        {!editing && (
          <button type="button" onClick={() => setArchived(!creator.archivedAt)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            {creator.archivedAt ? "Restore creator" : "Archive creator"}
          </button>
        )}
      </div>

      {notice && <p role="status" className="mb-4 text-sm text-[#53668e]">{notice}</p>}

      {editing ? (
        <div className="mx-auto max-w-2xl">
          <CreatorForm initial={creator} onSave={save} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <div className="space-y-6">
          <CreatorDealDashboard creatorId={creator.id} />

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
              <h2 className="text-lg font-bold">Profile</h2>
              <button type="button" onClick={() => setEditing(true)} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Edit</button>
            </div>
            <dl className="grid gap-5 p-5 sm:grid-cols-2">
              <div><dt className="text-xs text-[#53668e]">Category</dt><dd className="mt-1 text-sm font-medium">{creator.category || "—"}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-[#53668e]"><Mail className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />Email</dt><dd className="mt-1 text-sm font-medium">{creator.email || "—"}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-[#53668e]"><Phone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />Phone</dt><dd className="mt-1 text-sm font-medium">{creator.phone || "—"}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-xs text-[#53668e]"><AtSign className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />Instagram</dt><dd className="mt-1 text-sm font-medium">{creator.instagramHandle || "—"}</dd></div>
            </dl>
            {creator.notes && (
              <div className="border-t border-[#e5ebf5] px-5 py-5">
                <dt className="text-xs text-[#53668e]">Notes</dt>
                <dd className="mt-1.5 whitespace-pre-wrap text-sm">{creator.notes}</dd>
              </div>
            )}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
            <div>
              <h2 className="text-lg font-bold">Relationship</h2>
              <p className="mt-1 text-sm text-[#53668e]">
                {creator.relationship === "managed"
                  ? "Managed creators appear in Talent Management, with every deal across your campaigns."
                  : "External creators stay in your directory so you can reuse them in future campaigns."}
              </p>
              {creator.relationship !== "managed" && promoteBlockedReason && (
                <p className="mt-1.5 text-xs font-medium text-amber-700">{promoteBlockedReason}</p>
              )}
            </div>
            {creator.relationship === "managed" ? (
              <button type="button" onClick={() => setRelationship("external")} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                Stop managing
              </button>
            ) : (
              <button type="button" disabled={!!promoteBlockedReason} onClick={() => setRelationship("managed")} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                Make managed
              </button>
            )}
          </section>

          {creator.status !== "linked" && (
            <LinkAccountCard creator={creator} onLinked={(updated) => { setCreator(updated); setNotice("Creator linked to their account."); }} />
          )}

          <CreatorInvitationCard creator={creator} />
        </div>
      )}
    </div>
  );
}
