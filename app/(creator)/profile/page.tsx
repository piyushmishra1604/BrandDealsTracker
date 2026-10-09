"use client";

import { Banknote, Plus, User } from "lucide-react";
import { useState } from "react";
import { type BankAccount, type Profile } from "@/lib/profile";
import { FormSection } from "../../components/form-section";
import { CloudProfile } from "../../components/cloud-profile";
import { Sidebar } from "../../components/sidebar";

export default function ProfilePage() {
  return <CloudProfile>{(profile, saveProfile) => (
    <ProfileForm profile={profile} saveProfile={saveProfile} />
  )}</CloudProfile>;
}

function ProfileForm({ profile, saveProfile }: {
  profile: Profile;
  saveProfile: (profile: Profile) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const inputClass = "mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-brand-400 focus:outline-2 focus:outline-brand-500";

  function updateAccount(id: string, patch: Partial<BankAccount>) {
    setDraft(current => ({ ...current, bankAccounts: current.bankAccounts.map(account => account.id === id ? { ...account, ...patch } : account) }));
  }

  function toggleAccount(id: string) {
    setExpandedAccounts(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function addAccount() {
    const id = crypto.randomUUID();
    setDraft(current => ({ ...current, bankAccounts: [...current.bankAccounts, { id, label: "", bankName: "", accountHolder: "", accountNumber: "", ifscOrSwift: "", upiId: "" }] }));
    setExpandedAccounts(current => new Set(current).add(id));
  }

  async function handleSave() {
    const cleaned: Profile = {
      ...draft,
      brandName: draft.brandName?.trim(),
      senderName: draft.senderName.trim(),
      senderEmail: draft.senderEmail?.trim(),
      senderAddress: draft.senderAddress?.trim(),
      bankAccounts: draft.bankAccounts
        .map(account => ({
          ...account,
          label: account.label.trim(),
          bankName: account.bankName?.trim(),
          accountHolder: account.accountHolder?.trim(),
          accountNumber: account.accountNumber?.trim(),
          ifscOrSwift: account.ifscOrSwift?.trim(),
          upiId: account.upiId?.trim(),
        }))
        .filter(account => account.label),
    };
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saveError = await saveProfile(cleaned);
      if (saveError) setError(saveError);
      else { setDraft(cleaned); setNotice("Profile saved."); }
    } catch { setError("Could not save your profile. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f9] p-2 text-[#101c40] sm:p-4">
      <a href="#profile-form" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to Profile</a>
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_#20345c08] md:flex-row">
        <Sidebar />
        <main id="profile-form" className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile</h1>
          <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Your details and bank accounts, used to prefill new invoices.</p>
        </div>

        <div className="max-w-2xl space-y-6">
          <FormSection step={1} icon={User} title="Your Details" description="Shown as the “From” details on every invoice.">
            <div className="grid gap-4">
              <label className="text-xs text-[#405579]">Brand Name
                <input maxLength={120} placeholder="e.g. Ball Lifestyle" value={draft.brandName ?? ""} onChange={(event) => setDraft(current => ({ ...current, brandName: event.target.value }))} className={inputClass} />
                <span className="mt-1 block text-[#53668e]">Shown prominently at the top of every invoice.</span>
              </label>
              <label className="text-xs text-[#405579]">Name / Business Name
                <input maxLength={120} value={draft.senderName} onChange={(event) => setDraft(current => ({ ...current, senderName: event.target.value }))} className={inputClass} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs text-[#405579]">Email
                  <input type="email" maxLength={254} value={draft.senderEmail ?? ""} onChange={(event) => setDraft(current => ({ ...current, senderEmail: event.target.value }))} className={inputClass} />
                </label>
                <label className="text-xs text-[#405579]">Address
                  <textarea rows={2} maxLength={300} value={draft.senderAddress ?? ""} onChange={(event) => setDraft(current => ({ ...current, senderAddress: event.target.value }))} className={inputClass} />
                </label>
              </div>
            </div>
          </FormSection>

          <FormSection
            step={2}
            icon={Banknote}
            title="Bank Accounts"
            description="Add one or more accounts to choose from when creating an invoice."
            action={<button type="button" disabled={draft.bankAccounts.length >= 20} onClick={addAccount} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100 disabled:opacity-50">
              <Plus className="h-4 w-4" strokeWidth={2.2} /> Add Account
            </button>}
          >
            {draft.bankAccounts.length === 0 && <p className="text-sm text-[#53668e]">No bank accounts added yet.</p>}
            <div className="space-y-3">
              {draft.bankAccounts.map((account, index) => {
                const isExpanded = expandedAccounts.has(account.id);
                return (
                  <div key={account.id} className="overflow-hidden rounded-lg border border-[#edf1f8]">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button type="button" aria-expanded={isExpanded} aria-controls={`account-${account.id}`} onClick={() => toggleAccount(account.id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left">
                        <span aria-hidden="true" className="shrink-0 text-slate-500">{isExpanded ? "▾" : "▸"}</span>
                        <span className="truncate text-sm font-medium">{account.label || `Account ${index + 1}`}</span>
                      </button>
                      <button type="button" aria-label={`Remove account ${index + 1}`} onClick={() => { if (!window.confirm(`Remove ${account.label || `Account ${index + 1}`}?`)) return; setDraft(current => ({ ...current, bankAccounts: current.bankAccounts.filter(entry => entry.id !== account.id) })); setExpandedAccounts(current => { const next = new Set(current); next.delete(account.id); return next; }); }} className="shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                        Remove
                      </button>
                    </div>
                    {isExpanded && <div id={`account-${account.id}`} className="border-t border-[#edf1f8] p-4">
                      <label className="mb-3 block text-xs text-[#405579]">Label
                        <input aria-label={`Account ${index + 1} label`} required maxLength={60} placeholder="e.g. HDFC Primary" value={account.label} onChange={(event) => updateAccount(account.id, { label: event.target.value })} className={inputClass} />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-[#405579]">Bank Name
                          <input aria-label={`Account ${index + 1} bank name`} maxLength={120} value={account.bankName ?? ""} onChange={(event) => updateAccount(account.id, { bankName: event.target.value })} className={inputClass} />
                        </label>
                        <label className="text-xs text-[#405579]">Account Holder Name
                          <input aria-label={`Account ${index + 1} account holder`} maxLength={120} value={account.accountHolder ?? ""} onChange={(event) => updateAccount(account.id, { accountHolder: event.target.value })} className={inputClass} />
                        </label>
                        <label className="text-xs text-[#405579]">Account Number
                          <input aria-label={`Account ${index + 1} account number`} maxLength={120} value={account.accountNumber ?? ""} onChange={(event) => updateAccount(account.id, { accountNumber: event.target.value })} className={inputClass} />
                        </label>
                        <label className="text-xs text-[#405579]">IFSC / SWIFT Code
                          <input aria-label={`Account ${index + 1} IFSC or SWIFT`} maxLength={120} value={account.ifscOrSwift ?? ""} onChange={(event) => updateAccount(account.id, { ifscOrSwift: event.target.value })} className={inputClass} />
                        </label>
                        <label className="text-xs text-[#405579]">UPI ID
                          <input aria-label={`Account ${index + 1} UPI ID`} maxLength={120} value={account.upiId ?? ""} onChange={(event) => updateAccount(account.id, { upiId: event.target.value })} className={inputClass} />
                        </label>
                      </div>
                    </div>}
                  </div>
                );
              })}
            </div>
          </FormSection>

          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex items-center gap-3">
            <button type="button" disabled={saving} onClick={() => void handleSave()} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50">
              {saving ? "Saving…" : "Save Profile"}
            </button>
            <p role="status" className="text-sm text-[#53668e]">{notice}</p>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}
