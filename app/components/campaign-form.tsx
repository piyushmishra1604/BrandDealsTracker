"use client";

import { useState } from "react";
import { Building2, Calendar, DollarSign, Flag } from "lucide-react";
import { type Campaign, type CampaignInput, type CampaignStatus, campaignStatuses, campaignStatusLabels, campaignDateError } from "@/lib/campaigns";
import { currencies } from "@/lib/invoices";
import { todayDate } from "@/lib/deals";
import { FormSection } from "./form-section";

const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500";

export function CampaignForm({ initial, onSave, onCancel }: {
  initial?: Campaign;
  onSave: (input: CampaignInput) => Promise<string | null>;
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
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const dateError = campaignDateError(form);
    if (dateError) { setError(dateError); return; }
    setSaving(true);
    setError("");
    const result = await onSave(form);
    if (result) setError(result);
    setSaving(false);
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-5">
      <FormSection step={1} icon={Building2} title="Campaign brief" description="Which brand, and what's it called?">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-[#405579]">Brand
            <input type="text" required maxLength={120} value={form.brand} onChange={(event) => setForm(current => ({ ...current, brand: event.target.value }))} placeholder="Acme Skincare" className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579]">Campaign title
            <input type="text" required maxLength={160} value={form.title} onChange={(event) => setForm(current => ({ ...current, title: event.target.value }))} placeholder="Summer Glow Launch" className={inputClass} />
          </label>
        </div>
      </FormSection>

      <FormSection step={2} icon={DollarSign} title="Budget" description="Total budget agreed with the brand.">
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

      <FormSection step={3} icon={Calendar} title="Timeline" description="When does the campaign run?">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-[#405579]">Start date
            <input type="date" required value={form.startDate} onChange={(event) => setForm(current => ({ ...current, startDate: event.target.value }))} className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579]">End date
            <input type="date" required value={form.endDate} onChange={(event) => setForm(current => ({ ...current, endDate: event.target.value }))} className={inputClass} />
          </label>
        </div>
      </FormSection>

      <FormSection step={4} icon={Flag} title="Status" description="Where is this campaign at right now?">
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
