"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { type Deal } from "@/lib/deals";
import { type Invoice } from "@/lib/invoices";
import { type Profile } from "@/lib/profile";
import { CloudDashboard } from "../../../components/cloud-dashboard";
import { CloudInvoices } from "../../../components/cloud-invoices";
import { CloudProfile } from "../../../components/cloud-profile";
import { InvoiceForm } from "../../../components/invoice-form";
import { Sidebar } from "../../../components/sidebar";

export default function NewInvoicePage() {
  return <Suspense fallback={<p role="status" className="p-8">Loading…</p>}>
    <CloudDashboard>{(deals) => (
      <CloudInvoices>{(invoices, saveInvoice) => (
        <CloudProfile>{(profile) => (
          <NewInvoicePageContent deals={deals} invoices={invoices} saveInvoice={saveInvoice} profile={profile} />
        )}</CloudProfile>
      )}</CloudInvoices>
    )}</CloudDashboard>
  </Suspense>;
}

function NewInvoicePageContent({ deals, invoices, saveInvoice, profile }: {
  deals: Deal[];
  invoices: Invoice[];
  saveInvoice: (invoice: Invoice) => Promise<string | null>;
  profile: Profile;
}) {
  const router = useRouter();
  const dealId = useSearchParams().get("dealId");

  return (
    <div className="min-h-screen bg-[#f0f4f9] p-2 text-[#101c40] sm:p-4">
      <a href="#invoice-form" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to Create Invoice</a>
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[1600px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_#20345c08] md:flex-row">
        <Sidebar />
        <main id="invoice-form" className="min-w-0 flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create Invoice</h1>
            <p className="mt-1.5 text-sm text-[#53668e] sm:text-base">Create and send professional invoices for your brand deals.</p>
          </div>
          <Link href="/invoices" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">← Back to Invoices</Link>
        </div>

        <InvoiceForm deals={deals} invoices={invoices} saveInvoice={saveInvoice} profile={profile} dealId={dealId} onSaved={() => router.push("/invoices")} onCancel={() => router.push("/invoices")} />
        </main>
      </div>
    </div>
  );
}
