"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { type CreatorInput } from "@/lib/creators";
import { CreatorForm } from "./creator-form";

export function CreatorNewClient({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();

  async function save(input: CreatorInput) {
    try {
      const response = await fetch("/api/manager/creators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, ...input }) });
      const body = await response.json();
      if (!response.ok) return body.error ?? "Could not add the creator.";
      router.push(`/manager/creators/${body.creator.id}`);
      return null;
    } catch { return "Could not reach the server. Check your connection and try again."; }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/manager/creators" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#53668e] hover:text-[#101c40]">
        <ArrowLeft className="h-4 w-4" strokeWidth={2} /> Back to Creators
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Add Creator</h1>
      <CreatorForm onSave={save} onCancel={() => router.push("/manager/creators")} />
    </div>
  );
}
