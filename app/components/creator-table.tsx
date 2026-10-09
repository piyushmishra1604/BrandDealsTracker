"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Mail, Phone, Tag } from "lucide-react";
import { type Creator, type CreatorStatus } from "@/lib/creators";
import { CreatorStatusBadge } from "./creator-status-badge";

// Same corner-flag treatment as the campaign and creator-dashboard deal rows.
const cornerColors: Record<CreatorStatus, string> = {
  contact: "#eab308",
  linked: "#22c55e",
};

function StatusCorner({ status }: { status: CreatorStatus }) {
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-0 h-0 w-0 border-r-[14px] border-t-[14px] border-r-transparent"
      style={{ borderTopColor: cornerColors[status] }}
    />
  );
}

function CreatorActions({ creator }: { creator: Creator }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  return (
    <>
      <button
        type="button"
        aria-label={`Actions for ${creator.name}`}
        aria-expanded={open}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({
            top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 108)),
            left: Math.max(8, Math.min(rect.right - 128, window.innerWidth - 136)),
          });
          setOpen(current => !current);
        }}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#405579] hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && <>
        <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
        <div aria-label={`Actions for ${creator.name}`} style={position} className="fixed z-50 m-0 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <button type="button" onClick={() => { setOpen(false); router.push(`/manager/creators/${creator.id}`); }} className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[#101c40] hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600">
            View Profile
          </button>
        </div>
      </>}
    </>
  );
}

function CreatorDetails({ creator }: { creator: Creator }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-3">
      <div><dt className="flex items-center gap-1.5 text-xs text-[#53668e]"><Mail className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />Email</dt><dd className="mt-1 text-sm font-medium">{creator.email || "—"}</dd></div>
      <div><dt className="flex items-center gap-1.5 text-xs text-[#53668e]"><Phone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />Phone</dt><dd className="mt-1 text-sm font-medium">{creator.phone || "—"}</dd></div>
      <div><dt className="flex items-center gap-1.5 text-xs text-[#53668e]"><Tag className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />Category</dt><dd className="mt-1 text-sm font-medium">{creator.category || "—"}</dd></div>
      {creator.notes && <div className="sm:col-span-3"><dt className="text-xs text-[#53668e]">Notes</dt><dd className="mt-1 whitespace-pre-wrap text-sm">{creator.notes}</dd></div>}
    </dl>
  );
}

// Shared shape for the creator directory list (WP4.3). Mirrors the creator dashboard's
// deal rows: a kebab menu instead of a plain link, and a click-to-expand inline tray
// instead of navigating away immediately.
export function CreatorTable({ creators, emptyMessage }: { creators: Creator[]; emptyMessage: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{creators.length} creators.</caption>
        <thead className="bg-[#f5f7fb] text-xs text-[#405579]">
          <tr>
            {["Name", "Contact", "Instagram", "Category", "Status"].map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{label}</th>
            ))}
            <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {creators.length === 0 && (
            <tr><td colSpan={6} className="px-6 py-12 text-center text-[#53668e]">{emptyMessage}</td></tr>
          )}
          {creators.map((creator) => (
            <Fragment key={creator.id}>
              <tr
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button, a, [popover]")) return;
                  setExpandedId(expandedId === creator.id ? null : creator.id);
                }}
                className={`cursor-pointer border-t border-[#edf1f8] hover:bg-[#fafbfe] ${expandedId === creator.id ? "bg-[#f8faff]" : ""}`}
              >
                <td className="relative whitespace-nowrap px-5 py-4 font-medium">
                  <StatusCorner status={creator.status} />
                  <button type="button" aria-label={`Details for ${creator.name}`} aria-expanded={expandedId === creator.id} aria-controls={`creator-details-${creator.id}`} onClick={() => setExpandedId(expandedId === creator.id ? null : creator.id)} className="mr-2 cursor-pointer rounded px-1 py-1 text-slate-500 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600">
                    <span aria-hidden="true">{expandedId === creator.id ? "▾" : "▸"}</span>
                  </button>
                  {creator.name}
                </td>
                <td className="px-5 py-4 text-[#53668e]">{creator.email || creator.phone || "—"}</td>
                <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">
                  {creator.instagramHandle ? <span className="inline-flex items-center gap-1"><AtSign className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />{creator.instagramHandle}</span> : "—"}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-[#53668e]">{creator.category || "—"}</td>
                <td className="whitespace-nowrap px-5 py-4"><CreatorStatusBadge status={creator.status} /></td>
                <td className="px-3 py-2">
                  <CreatorActions creator={creator} />
                </td>
              </tr>
              <tr id={`creator-details-${creator.id}`} hidden={expandedId !== creator.id} className="border-t border-[#edf1f8] bg-[#f8faff]">
                <td colSpan={6} className="px-6 py-5">
                  {expandedId === creator.id && <CreatorDetails creator={creator} />}
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
