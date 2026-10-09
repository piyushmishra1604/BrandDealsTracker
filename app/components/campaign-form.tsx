"use client";

import { useState } from "react";
import { Building2, Calendar, DollarSign, Flag, ImagePlus, X } from "lucide-react";
import { type Campaign, type CampaignInput, type CampaignStatus, campaignStatuses, campaignStatusLabels, campaignDateError } from "@/lib/campaigns";
import { currencies } from "@/lib/invoices";
import { todayDate } from "@/lib/deals";
import { FormSection } from "./form-section";

const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500";

export type CampaignFormInput = CampaignInput & { imageUrl?: string | null };

export function CampaignForm({ workspaceId, initial, onSave, onCancel }: {
  workspaceId: string;
  initial?: Campaign;
  onSave: (input: CampaignFormInput) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CampaignInput>(() => initial ?? {
    brand: "",
    title: "",
    budget: 0,
    currency: "INR",
    startDate: todayDate(),
    endDate: todayDate(),
    status: "draft",
    category: "",
    description: "",
  });
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function uploadImage(file: File) {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("workspaceId", workspaceId);
      formData.append("file", file);
      const response = await fetch("/api/manager/campaigns/image", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Could not upload the image."); return; }
      setImageUrl(body.url);
    } catch { setError("Could not reach the server. Check your connection and try again."); }
    finally { setUploading(false); }
  }

  async function submit() {
    const dateError = campaignDateError(form);
    if (dateError) { setError(dateError); return; }
    setSaving(true);
    setError("");
    const result = await onSave({ ...form, imageUrl });
    if (result) setError(result);
    setSaving(false);
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-5">
      <FormSection step={1} icon={ImagePlus} title="Campaign image" description="Optional — a thumbnail or brand logo for this campaign.">
        {imageUrl ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset */}
            <img src={imageUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
            <button type="button" onClick={() => setImageUrl(null)} aria-label="Remove image" className="absolute -right-2 -top-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-[#53668e] shadow-[0_1px_4px_rgba(16,24,64,0.2)] hover:text-red-600">
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-[#53668e] hover:bg-slate-100">
            {uploading ? <span>Uploading…</span> : <><ImagePlus className="h-5 w-5" strokeWidth={2} aria-hidden="true" /><span>Add image</span></>}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }}
            />
          </label>
        )}
      </FormSection>

      <FormSection step={2} icon={Building2} title="Campaign brief" description="Which brand, and what's it called?">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-[#405579]">Brand
            <input type="text" required maxLength={120} value={form.brand} onChange={(event) => setForm(current => ({ ...current, brand: event.target.value }))} placeholder="Acme Skincare" className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579]">Campaign title
            <input type="text" required maxLength={160} value={form.title} onChange={(event) => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Summer Glow Launch" className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579]">Category
            <input type="text" maxLength={120} value={form.category ?? ""} onChange={(event) => setForm(current => ({ ...current, category: event.target.value }))} placeholder="Fashion, Fitness…" className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579] sm:col-span-2">Description
            <textarea maxLength={500} rows={2} value={form.description ?? ""} onChange={(event) => setForm(current => ({ ...current, description: event.target.value }))} placeholder="A short description shown on the campaign overview." className={inputClass} />
          </label>
        </div>
      </FormSection>

      <FormSection step={3} icon={DollarSign} title="Budget" description="Total budget agreed with the brand.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-[#405579]">Budget
            <input type="number" required min={0} max={100_000_000} step="0.01" value={form.budget} onChange={(event) => setForm(current => ({ ...current, budget: Number(event.target.value) }))} className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579]">Currency
            <select value={form.currency} onChange={(event) => setForm(current => ({ ...current, currency: event.target.value as CampaignInput["currency"] }))} className={inputClass}>
              {currencies.map((entry) => <option key={entry.code} value={entry.code}>{entry.label}</option>)}
            </select>
          </label>
        </div>
      </FormSection>

      <FormSection step={4} icon={Calendar} title="Timeline" description="When does the campaign run?">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-[#405579]">Start date
            <input type="date" required value={form.startDate} onChange={(event) => setForm(current => ({ ...current, startDate: event.target.value }))} className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579]">End date
            <input type="date" required value={form.endDate} onChange={(event) => setForm(current => ({ ...current, endDate: event.target.value }))} className={inputClass} />
          </label>
        </div>
      </FormSection>

      <FormSection step={5} icon={Flag} title="Status" description="Where is this campaign at right now?">
        <label className="block text-xs text-[#405579]">Status
          <select value={form.status} onChange={(event) => setForm(current => ({ ...current, status: event.target.value as CampaignStatus }))} className={inputClass}>
            {campaignStatuses.filter(status => status !== "archived").map((status) => <option key={status} value={status}>{campaignStatusLabels[status]}</option>)}
          </select>
        </label>
      </FormSection>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving…" : initial ? "Save changes" : "Create Campaign"}
        </button>
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium hover:bg-slate-50">Cancel</button>
      </div>
    </form>
  );
}
