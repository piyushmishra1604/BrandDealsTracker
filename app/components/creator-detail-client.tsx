"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, AtSign, Megaphone } from "lucide-react";
import { type Creator, type CreatorInput } from "@/lib/creators";
import { type CampaignCreatorEntry } from "@/lib/campaign-creators";
import { CreatorStatusBadge } from "./creator-status-badge";
import { CreatorForm } from "./creator-form";
import { LinkAccountCard } from "./link-account-card";
import { CampaignStatusBadge } from "./campaign-status-badge";

export function CreatorDetailClient({ creator: initialCreator, linkedEmail }: { creator: Creator; linkedEmail?: string | null }) {
  const [creator, setCreator] = useState(initialCreator);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [campaignEntries, setCampaignEntries] = useState<CampaignCreatorEntry[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/manager/creators/${creator.id}/campaigns`);
        if (!response.ok) return;
        const body = await response.json();
        if (!cancelled) setCampaignEntries(body.entries ?? []);
      } finally {
        if (!cancelled) setLoadingCampaigns(false);
      }
    })();
    return () => { cancelled = true; };
  }, [creator.id]);

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

  return (
    <div>
      <Link href="/manager/creators" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#53668e] hover:text-[#101c40]">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to Creators
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{creator.name}</h1>
          <CreatorStatusBadge status={creator.status} />
        </div>
      </div>

      {notice && <p role="status" className="mb-4 text-sm text-[#53668e]">{notice}</p>}

      {editing ? (
        <div className="mx-auto max-w-2xl">
          <CreatorForm initial={creator} onSave={save} onCancel={() => setEditing(false)} />
        </div>
      ) : (
        <div className="space-y-6">
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

          <LinkAccountCard creator={creator} linkedEmail={linkedEmail} onLinked={(updated) => { setCreator(updated); setNotice("Creator linked to their account."); }} />

          <section>
            <h2 className="mb-3 text-lg font-bold">Campaigns</h2>
            {loadingCampaigns ? (
              <p className="text-sm text-[#53668e]">Loading campaigns…</p>
            ) : campaignEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#d7e0f0] bg-[#f7f9fd] px-6 py-14 text-center">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Megaphone className="h-5 w-5" strokeWidth={2} />
                </span>
                <p className="text-sm font-semibold text-[#101c40]">Not assigned to any campaigns yet</p>
                <p className="max-w-sm text-sm text-[#53668e]">Add this creator to a campaign from the campaign&apos;s detail page.</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#e5ebf5] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,64,0.04)]">
                {campaignEntries.map((entry) => entry.campaign && (
                  <li key={entry.id}>
                    <Link href={`/manager/campaigns/${entry.campaign.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-semibold text-[#101c40]">{entry.campaign.title}</p>
                        <p className="text-xs text-[#53668e]">{entry.campaign.brand}</p>
                      </div>
                      <CampaignStatusBadge status={entry.campaign.status as Parameters<typeof CampaignStatusBadge>[0]["status"]} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
