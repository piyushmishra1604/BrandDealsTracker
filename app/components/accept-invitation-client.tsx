"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type Status = "idle" | "submitting" | "done" | "error";

export function AcceptInvitationClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>(token ? "idle" : "error");
  const [message, setMessage] = useState(token ? "" : "This invitation link is incomplete. Ask the manager for a new one.");

  async function accept() {
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/creator-invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const body = await response.json();
      if (!response.ok) { setStatus("error"); setMessage(body.error ?? "This invitation could not be accepted."); return; }
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Could not reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f4f9] p-4 text-[#101c40]">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_8px_32px_#20345c08]">
        <h1 className="text-xl font-bold tracking-tight">Connect with your manager</h1>
        {status === "done" ? (
          <div className="mt-4 space-y-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              You&rsquo;re connected. Any deals they&rsquo;ve recorded for you are now in your dashboard.
            </p>
            <Link href="/" className="inline-block rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white">Go to my dashboard</Link>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-[#53668e]">
              Accepting links your creator account to the manager who invited you. Use the email address the invitation was sent to. If you&rsquo;re not signed in, sign in as a creator first, then open this link again.
            </p>
            {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
            {token && (
              <button type="button" onClick={() => void accept()} disabled={status === "submitting"} className="cursor-pointer rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {status === "submitting" ? "Connecting…" : "Accept invitation"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
