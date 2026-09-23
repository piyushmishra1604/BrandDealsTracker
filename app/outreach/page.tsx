"use client";

import { Fragment, useRef, useState } from "react";
import { todayDate } from "@/lib/deals";
import { type Outreach, type OutreachSource, type OutreachStatus, outreachSources, outreachStatuses, isOutreach } from "@/lib/outreach";
import { CloudOutreach } from "../components/cloud-outreach";
import { Sidebar } from "../components/sidebar";

const cardIcons = {
  brands: { color: "bg-[#e5edff] text-[#2869ff]", path: "M3 6h18v12H3V6Zm0 0 9 7 9-7" },
  conversation: { color: "bg-[#fff0cc] text-[#bd790d]", path: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" },
  converted: { color: "bg-[#d9f5e8] text-[#06a968]", path: "M9 12l2 2 4-4M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" },
  notPursuing: { color: "bg-[#ffe3e3] text-[#c0392b]", path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM8 8l8 8M16 8l-8 8" },
};

function StatCard({ title, value, icon, caption }: { title: string; value: string; icon: keyof typeof cardIcons; caption: string }) {
  const { color, path } = cardIcons[icon];
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#e5ebf5] bg-[#f9fbff] p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${color}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d={path} /></svg>
      </span>
      <div className="min-w-0 pt-1">
        <p className="text-sm font-medium text-[#405579]">{title}</p>
        <p className="mt-4 break-words text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1.5 text-xs text-[#53668e]">{caption}</p>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function OutreachPage() {
  return <CloudOutreach>{(outreach, persistOutreach, removeOutreach) => (
    <BrandOutreach outreach={outreach} persistOutreach={persistOutreach} removeOutreach={removeOutreach} />
  )}</CloudOutreach>;
}

function BrandOutreach({ outreach, persistOutreach, removeOutreach }: {
  outreach: Outreach[];
  persistOutreach: (item: Outreach) => Promise<string | null>;
  removeOutreach: (id: string) => Promise<string | null>;
}) {
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newOutreach, setNewOutreach] = useState<Outreach | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function deleteOutreach(item: Outreach) {
    if (deletingId || !window.confirm(`Delete the outreach record for ${item.brandName}? This permanently removes it and cannot be undone.`)) return;
    setDeletingId(item.id);
    setExpandedId(null);
    setDetailsId(null);
    setNotice("");
    try {
      const error = await removeOutreach(item.id);
      setNotice(error ?? `${item.brandName} deleted.`);
    } catch { setNotice("Could not delete the record. Please try again."); }
    finally { setDeletingId(null); }
  }

  async function saveOutreach(updated: Outreach) {
    const error = await persistOutreach(updated);
    if (error) return error;
    setExpandedId(null);
    setNewOutreach(null);
    setNotice(`${updated.brandName} saved.`);
    return null;
  }

  const searchLower = search.trim().toLowerCase();
  const filteredOutreach = outreach.filter(item =>
    !searchLower || item.brandName.toLowerCase().includes(searchLower) || (item.contactPerson ?? "").toLowerCase().includes(searchLower));

  const totalBrands = outreach.length;
  const inConversationCount = outreach.filter(item => item.status === "In Conversation").length;
  const convertedCount = outreach.filter(item => item.status === "Converted").length;
  const notPursuingCount = outreach.filter(item => item.status === "Not Interested").length;

  return (
    <div className="min-h-screen bg-[#f0f4f9] p-2 text-[#101c40] sm:p-4">
      <a href="#outreach" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to Brand Outreach</a>
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_#20345c08] md:flex-row">
        <Sidebar />
        <main id="outreach" className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">

        <div className="mb-9 flex flex-wrap items-start justify-between gap-4 sm:mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Brand Outreach</h1>
            <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">
              Keep track of brands you&apos;re talking to before they become deals.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setNewOutreach({ id: crypto.randomUUID(), brandName: "", contactPerson: "", contactRole: "", source: "Other", dateReachedOut: todayDate(), status: "New", notes: "" })}
            className="rounded-lg bg-[#243657] px-5 py-3 text-sm font-semibold text-white shadow-[0_3px_10px_#20345c20] transition-colors hover:bg-[#172846] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            + Add Brand
          </button>
        </div>

        {newOutreach && <section className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <OutreachEditor item={newOutreach} onSave={saveOutreach} onCancel={() => setNewOutreach(null)} />
        </section>}

        <p role="status" className="mb-4 text-sm text-[#53668e]">{notice}</p>

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="brands" title="Total Brands" value={totalBrands.toString()} caption="all outreach records" />
          <StatCard icon="conversation" title="In Conversation" value={inConversationCount.toString()} caption="currently in discussion" />
          <StatCard icon="converted" title="Converted to Deals" value={convertedCount.toString()} caption="turned into brand deals" />
          <StatCard icon="notPursuing" title="Not Pursuing" value={notPursuingCount.toString()} caption="not moving forward" />
        </section>

        <section aria-label="Filter brand outreach" className="mb-7 flex flex-wrap items-center justify-between gap-4">
          <button type="button" aria-pressed="true" className="shrink-0 rounded-full bg-[#e8efff] px-4 py-2.5 text-sm font-medium text-[#0655ff]">
            All
          </button>
          <label className="w-full sm:w-64">
            <span className="sr-only">Search brands</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search brands…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-2 focus:outline-blue-600"
            />
          </label>
        </section>

        <section aria-labelledby="outreach-heading" className="overflow-hidden rounded-xl border border-[#e5ebf5] bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf5] px-5 py-5">
            <h2 id="outreach-heading" className="text-lg font-bold">Brand Outreach</h2>
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Up to {filteredOutreach.length} brand outreach records.</caption>
              <thead className="bg-[#f5f7fb] text-xs text-[#405579]">
                <tr>
                  {["Brand", "Contact Person", "Source", "Date Reached Out", "Last Update", "Status"].map((label) => (
                    <th key={label} scope="col" className="whitespace-nowrap px-5 py-3 font-medium">{label}</th>
                  ))}
                  <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredOutreach.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-[#53668e]">
                    {outreach.length === 0 ? "No brand outreach yet." : "No brands match your search."}
                  </td></tr>
                )}
                {filteredOutreach.map((item) => (
                  <Fragment key={item.id}>
                    <tr onClick={(event) => {
                      if ((event.target as HTMLElement).closest("button, a, [popover]")) return;
                      setDetailsId(detailsId === item.id ? null : item.id);
                    }} className={`cursor-pointer border-t border-[#edf1f8] hover:bg-[#fafbfe] ${detailsId === item.id ? "bg-[#f8faff]" : ""}`}>
                      <td className="relative min-w-32 px-5 py-4 font-medium">
                        <OutreachCorner status={item.status} />
                        <button type="button" aria-label={`Details for ${item.brandName}`} aria-expanded={detailsId === item.id} aria-controls={`outreach-details-${item.id}`} onClick={() => setDetailsId(detailsId === item.id ? null : item.id)} className="mr-2 cursor-pointer rounded px-1 py-1 text-slate-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
                          <span aria-hidden="true">{detailsId === item.id ? "▾" : "▸"}</span>
                        </button>
                        {item.brandName}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">{item.contactPerson || "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4"><SourceBadge source={item.source} /></td>
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(item.dateReachedOut)}</td>
                      <td className="whitespace-nowrap px-5 py-4">{item.updated_at ? formatDate(item.updated_at.slice(0, 10)) : "—"}</td>
                      <td className="px-5 py-4"><OutreachStatusBadge status={item.status} /></td>
                      <td className="px-3 py-2">
                        <OutreachActions item={item} disabled={deletingId !== null} onEdit={() => setExpandedId(item.id)} onDelete={() => void deleteOutreach(item)} />
                      </td>
                    </tr>
                    <tr id={`outreach-details-${item.id}`} hidden={detailsId !== item.id} className="border-t border-[#edf1f8] bg-[#f8faff]">
                      <td colSpan={7} className="px-6 py-5">
                        <OutreachDetails item={item} onSave={saveOutreach} />
                      </td>
                    </tr>
                    {expandedId === item.id && (
                      <tr className="border-t border-[#edf1f8] bg-[#f8faff]">
                        <td colSpan={7} className="px-5 py-4">
                          <OutreachEditor item={item} onSave={saveOutreach} onCancel={() => setExpandedId(null)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[#edf1f8] sm:hidden">
            {filteredOutreach.length === 0 && (
              <p className="px-5 py-12 text-center text-sm text-[#53668e]">
                {outreach.length === 0 ? "No brand outreach yet." : "No brands match your search."}
              </p>
            )}
            {filteredOutreach.map((item) => (
              <div key={item.id}>
                <div onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button, a, [popover]")) return;
                  setDetailsId(detailsId === item.id ? null : item.id);
                }} className={`relative cursor-pointer px-5 py-4 ${detailsId === item.id ? "bg-[#f8faff]" : ""}`}>
                  <OutreachCorner status={item.status} />
                  <div className="flex items-start justify-between gap-3 pl-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 font-medium">
                        <button type="button" aria-label={`Details for ${item.brandName}`} aria-expanded={detailsId === item.id} aria-controls={`outreach-details-${item.id}`} onClick={() => setDetailsId(detailsId === item.id ? null : item.id)} className="shrink-0 cursor-pointer rounded px-1 py-1 text-slate-500 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
                          <span aria-hidden="true">{detailsId === item.id ? "▾" : "▸"}</span>
                        </button>
                        <span>{item.brandName}</span>
                      </div>
                      {item.contactPerson && <p className="mt-1 pl-6 text-sm text-[#53668e]">{item.contactPerson}</p>}
                    </div>
                    <OutreachActions item={item} disabled={deletingId !== null} onEdit={() => setExpandedId(item.id)} onDelete={() => void deleteOutreach(item)} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-6 text-xs text-[#53668e]">
                    <SourceBadge source={item.source} />
                    <span>Reached out: {formatDate(item.dateReachedOut)}</span>
                    <OutreachStatusBadge status={item.status} />
                  </div>
                </div>
                <div id={`outreach-details-${item.id}`} hidden={detailsId !== item.id} className="bg-[#f8faff] px-5 py-5">
                  <OutreachDetails item={item} onSave={saveOutreach} />
                </div>
                {expandedId === item.id && (
                  <div className="bg-[#f8faff] px-5 py-4">
                    <OutreachEditor item={item} onSave={saveOutreach} onCancel={() => setExpandedId(null)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}

function OutreachEditor({ item, onSave, onCancel }: {
  item: Outreach;
  onSave: (item: Outreach) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600";
  return (
    <form aria-label={item.brandName ? `Edit ${item.brandName}` : "Add brand"} onSubmit={async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const updated: Outreach = {
        ...item,
        brandName: String(form.get("brandName") ?? "").trim(),
        contactPerson: String(form.get("contactPerson") ?? "").trim(),
        contactRole: String(form.get("contactRole") ?? "").trim(),
        source: String(form.get("source") ?? "Other") as OutreachSource,
        dateReachedOut: String(form.get("dateReachedOut")),
        status: String(form.get("status") ?? "New") as OutreachStatus,
        notes: String(form.get("notes") ?? "").trim(),
      };
      if (!isOutreach(updated)) { setError("Enter a brand name and a valid date reached out."); return; }
      setSaving(true);
      try { setError(await onSave(updated) ?? ""); }
      catch { setError("Could not save. Please try again."); }
      finally { setSaving(false); }
    }}>
      <fieldset disabled={saving}>
      <h3 className="mb-3 font-semibold">{item.brandName ? "Edit brand outreach" : "Add brand"}</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="text-xs text-[#405579]">Brand name<input autoFocus name="brandName" required maxLength={120} defaultValue={item.brandName} className={inputClass} /></label>
        <label className="text-xs text-[#405579]">Contact person<input name="contactPerson" maxLength={120} defaultValue={item.contactPerson ?? ""} className={inputClass} /></label>
        <label className="text-xs text-[#405579]">Contact role<input name="contactRole" maxLength={120} defaultValue={item.contactRole ?? ""} className={inputClass} /></label>
        <label className="text-xs text-[#405579]">Source
          <select name="source" defaultValue={item.source} className={inputClass}>
            {outreachSources.map(source => <option key={source}>{source}</option>)}
          </select>
        </label>
        <label className="text-xs text-[#405579]">Date reached out<input name="dateReachedOut" type="date" required min="0001-01-01" max="9999-12-31" defaultValue={item.dateReachedOut} className={inputClass} /></label>
        <label className="text-xs text-[#405579]">Status
          <select name="status" defaultValue={item.status} className={inputClass}>
            {outreachStatuses.map(status => <option key={status}>{status}</option>)}
          </select>
        </label>
      </div>
      <label className="mt-4 block text-xs text-[#405579]">Notes (optional)
        <textarea name="notes" rows={3} maxLength={5000} defaultValue={item.notes ?? ""} placeholder="What was discussed, next steps, etc…" className={inputClass} />
      </label>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex items-center gap-3">
        <button type="submit" className="cursor-pointer rounded-lg bg-[#243657] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172846]">{saving ? "Saving…" : item.brandName ? "Save changes" : "Add Brand"}</button>
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">Cancel</button>
        <p className="text-xs text-[#53668e]">Saved to Supabase.</p>
      </div>
      </fieldset>
    </form>
  );
}

function OutreachDetails({ item, onSave }: { item: Outreach; onSave: (item: Outreach) => Promise<string | null> }) {
  const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600";

  const [editingInfo, setEditingInfo] = useState(false);
  const [contactPerson, setContactPerson] = useState(item.contactPerson ?? "");
  const [contactRole, setContactRole] = useState(item.contactRole ?? "");
  const [source, setSource] = useState(item.source);
  const [dateReachedOut, setDateReachedOut] = useState(item.dateReachedOut);
  const [status, setStatus] = useState(item.status);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState("");

  function startEditingInfo() {
    setContactPerson(item.contactPerson ?? "");
    setContactRole(item.contactRole ?? "");
    setSource(item.source);
    setDateReachedOut(item.dateReachedOut);
    setStatus(item.status);
    setInfoError("");
    setEditingInfo(true);
  }
  async function saveInfo() {
    const updated: Outreach = { ...item, contactPerson: contactPerson.trim(), contactRole: contactRole.trim(), source, dateReachedOut, status };
    if (!isOutreach(updated)) { setInfoError("Enter a valid date reached out."); return; }
    setSavingInfo(true);
    setInfoError("");
    try {
      const error = await onSave(updated);
      if (error) setInfoError(error);
      else setEditingInfo(false);
    } catch { setInfoError("Could not save. Please try again."); }
    finally { setSavingInfo(false); }
  }

  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState("");

  function startEditingNotes() {
    setNotes(item.notes ?? "");
    setNotesError("");
    setEditingNotes(true);
  }
  async function saveNotes() {
    setSavingNotes(true);
    setNotesError("");
    try {
      const error = await onSave({ ...item, notes: notes.trim() });
      if (error) setNotesError(error);
      else setEditingNotes(false);
    } catch { setNotesError("Could not save notes. Please try again."); }
    finally { setSavingNotes(false); }
  }

  return (
    <div className="rounded-xl border border-[#e9e6f5] bg-gradient-to-br from-[#fff7fa] to-[#f1f6ff] p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="break-words text-xl font-bold">{item.brandName}</h3>
        {!editingInfo && <button type="button" onClick={(event) => { event.stopPropagation(); startEditingInfo(); }} className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">Edit</button>}
      </div>
      {editingInfo ? (
        <div className="mb-5 rounded-xl border border-[#e5ebf5] bg-white p-4" onClick={(event) => event.stopPropagation()}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs text-[#405579]">Contact person<input value={contactPerson} onChange={(event) => setContactPerson(event.target.value)} maxLength={120} className={inputClass} /></label>
            <label className="text-xs text-[#405579]">Contact role<input value={contactRole} onChange={(event) => setContactRole(event.target.value)} maxLength={120} className={inputClass} /></label>
            <label className="text-xs text-[#405579]">Source
              <select value={source} onChange={(event) => setSource(event.target.value as OutreachSource)} className={inputClass}>
                {outreachSources.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="text-xs text-[#405579]">Date reached out<input type="date" value={dateReachedOut} onChange={(event) => setDateReachedOut(event.target.value)} min="0001-01-01" max="9999-12-31" className={inputClass} /></label>
            <label className="text-xs text-[#405579]">Status
              <select value={status} onChange={(event) => setStatus(event.target.value as OutreachStatus)} className={inputClass}>
                {outreachStatuses.map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" disabled={savingInfo} onClick={() => void saveInfo()} className="cursor-pointer rounded-lg bg-[#243657] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172846] disabled:opacity-50">{savingInfo ? "Saving…" : "Save changes"}</button>
            <button type="button" disabled={savingInfo} onClick={() => setEditingInfo(false)} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs">Cancel</button>
          </div>
          {infoError && <p role="alert" className="mt-2 text-xs text-red-700">{infoError}</p>}
        </div>
      ) : (
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            {item.contactRole && <p className="text-sm text-[#53668e]">{item.contactRole}</p>}
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:flex-1 lg:max-w-2xl lg:grid-cols-4">
            <div className="rounded-lg border border-white bg-white/80 px-4 py-3"><dt className="text-xs text-[#53668e]">Contact Person</dt><dd className="mt-1 text-sm font-medium">{item.contactPerson || "—"}</dd></div>
            <div className="rounded-lg border border-white bg-white/80 px-4 py-3"><dt className="text-xs text-[#53668e]">Source</dt><dd className="mt-1"><SourceBadge source={item.source} /></dd></div>
            <div className="rounded-lg border border-white bg-white/80 px-4 py-3"><dt className="text-xs text-[#53668e]">Date Reached Out</dt><dd className="mt-1 text-sm font-medium">{formatDate(item.dateReachedOut)}</dd></div>
            <div className="rounded-lg border border-white bg-white/80 px-4 py-3"><dt className="mb-1 text-xs text-[#53668e]">Status</dt><dd><OutreachStatusBadge status={item.status} /></dd></div>
          </dl>
        </div>
      )}
      <section className="rounded-xl border border-[#e5ebf5] bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-semibold">Notes</h4>
          {!editingNotes && <button type="button" onClick={(event) => { event.stopPropagation(); startEditingNotes(); }} className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">Edit</button>}
        </div>
        {editingNotes ? (
          <div onClick={(event) => event.stopPropagation()}>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={5000} placeholder="What was discussed, next steps, etc…" className={inputClass} />
            <div className="mt-2 flex items-center gap-3">
              <button type="button" disabled={savingNotes} onClick={() => void saveNotes()} className="cursor-pointer rounded-lg bg-[#243657] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#172846] disabled:opacity-50">{savingNotes ? "Saving…" : "Save notes"}</button>
              <button type="button" disabled={savingNotes} onClick={() => setEditingNotes(false)} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs">Cancel</button>
            </div>
            {notesError && <p role="alert" className="mt-2 text-xs text-red-700">{notesError}</p>}
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#53668e]">{item.notes || "No notes added yet."}</p>
        )}
      </section>
    </div>
  );
}

function OutreachActions({ item, disabled, onEdit, onDelete }: {
  item: Outreach; disabled: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const popover = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const id = `outreach-actions-${item.id}`;
  return (
    <>
      <button
        type="button"
        aria-label={`Actions for ${item.brandName}`}
        disabled={disabled}
        popoverTarget={id}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setPosition({
            top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 108)),
            left: Math.max(8, Math.min(rect.right - 128, window.innerWidth - 136)),
          });
        }}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-[#405579] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        aria-label={`Actions for ${item.brandName}`}
        style={position}
        className="fixed m-0 w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
      >
        <button type="button" onClick={() => { popover.current?.hidePopover(); onEdit(); }} className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-[#101c40] hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
          Edit
        </button>
        <button type="button" onClick={() => { popover.current?.hidePopover(); onDelete(); }} className="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-600">
          Delete
        </button>
      </div>
    </>
  );
}

function SourceBadge({ source }: { source: OutreachSource }) {
  return <span className="inline-flex whitespace-nowrap rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{source}</span>;
}

const statusColors: Record<OutreachStatus, string> = {
  New: "bg-[#e8efff] text-[#0655ff]",
  "In Conversation": "bg-[#fff0cc] text-[#bd790d]",
  Interested: "bg-[#d9f5e8] text-[#087a4d]",
  "Not Interested": "bg-[#ffe3e3] text-[#c0392b]",
  Converted: "bg-[#d9f5e8] text-[#087a4d]",
};

function OutreachStatusBadge({ status }: { status: OutreachStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${statusColors[status]}`}>{status}</span>;
}

// Same corner-triangle style as the Deals table's status indicator.
function getOutreachCornerColor(status: OutreachStatus) {
  if (status === "New") return "#94a3b8";
  if (status === "In Conversation") return "#eab308";
  if (status === "Not Interested") return "#ef4444";
  return "#22c55e";
}

function OutreachCorner({ status }: { status: OutreachStatus }) {
  return (
    <span
      aria-hidden="true"
      className="absolute left-0 top-0 h-0 w-0 border-r-[14px] border-t-[14px] border-r-transparent"
      style={{ borderTopColor: getOutreachCornerColor(status) }}
    />
  );
}
