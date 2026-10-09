"use client";

import { useState } from "react";
import { User, AtSign, StickyNote } from "lucide-react";
import { type Creator, type CreatorInput } from "@/lib/creators";
import { FormSection } from "./form-section";

const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500";

export function CreatorForm({ initial, onSave, onCancel }: {
  initial?: Creator;
  onSave: (input: CreatorInput) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CreatorInput>(() => initial ?? {
    name: "", email: "", phone: "", instagramHandle: "", category: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    const result = await onSave(form);
    if (result) setError(result);
    setSaving(false);
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-5">
      <FormSection step={1} icon={User} title="Creator details" description="Who are they, and how do you reach them?">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs text-[#405579]">Name
            <input type="text" required maxLength={120} value={form.name} onChange={(event) => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Ankita Rath" className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579]">Category
            <input type="text" maxLength={120} value={form.category ?? ""} onChange={(event) => setForm(current => ({ ...current, category: event.target.value }))} placeholder="Fashion, Fitness…" className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579]">Email
            <input type="email" maxLength={254} value={form.email ?? ""} onChange={(event) => setForm(current => ({ ...current, email: event.target.value }))} placeholder="creator@example.com" className={inputClass} />
          </label>
          <label className="block text-xs text-[#405579]">Phone
            <input type="tel" maxLength={16} value={form.phone ?? ""} onChange={(event) => setForm(current => ({ ...current, phone: event.target.value }))} placeholder="+91 98765 43210" className={inputClass} />
          </label>
        </div>
      </FormSection>

      <FormSection step={2} icon={AtSign} title="Social" description="Optional — helps you find them later.">
        <label className="block text-xs text-[#405579]">Instagram handle
          <input type="text" maxLength={50} value={form.instagramHandle ?? ""} onChange={(event) => setForm(current => ({ ...current, instagramHandle: event.target.value }))} placeholder="@ankitarath" className={inputClass} />
        </label>
      </FormSection>

      <FormSection step={3} icon={StickyNote} title="Notes" description="Anything useful for the next conversation.">
        <label className="block text-xs text-[#405579]">Notes
          <textarea maxLength={5000} rows={4} value={form.notes ?? ""} onChange={(event) => setForm(current => ({ ...current, notes: event.target.value }))} placeholder="Previously worked with us on..." className={inputClass} />
        </label>
      </FormSection>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50">
          {saving ? "Saving…" : initial ? "Save changes" : "Add Creator"}
        </button>
        <button type="button" onClick={onCancel} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium hover:bg-slate-50">Cancel</button>
      </div>
    </form>
  );
}
