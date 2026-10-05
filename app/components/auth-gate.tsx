"use client";

import { useEffect, useState, type ReactNode } from "react";

type CurrentUser = { id: string; email: string };

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then(response => response.ok ? response.json() : { user: null })
      .then(body => { if (active) setUser(body.user); })
      .catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, []);

  if (user === undefined) return <p role="status" className="p-8">Loading…</p>;
  if (user === null) return <LoginScreen onSignedIn={setUser} />;
  return <>{children}</>;
}

type Mode = "login" | "signup";

function LoginScreen({ onSignedIn }: { onSignedIn: (user: CurrentUser) => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Something went wrong. Please try again."); return; }
      onSignedIn(body.user);
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setSubmitting(false); }
  }

  const titles: Record<Mode, string> = { login: "Sign in to BrandTracker", signup: "Create your account" };
  const submitLabels: Record<Mode, string> = { login: "Sign in", signup: "Create account" };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f4f9] p-4 text-[#101c40]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_8px_32px_#20345c08]">
        <h1 className="text-xl font-bold tracking-tight">{titles[mode]}</h1>
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="mt-5 space-y-4">
          <label className="block text-xs text-[#405579]">Email
            <input type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600" />
          </label>
          <label className="block text-xs text-[#405579]">Password
            <input type="password" required minLength={8} maxLength={200} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full cursor-pointer rounded-lg bg-[#243657] px-4 py-3 text-sm font-semibold text-white hover:bg-[#172846] disabled:opacity-50">
            {submitting ? "Please wait…" : submitLabels[mode]}
          </button>
        </form>
        <div className="mt-4 space-y-1 text-xs text-[#53668e]">
          {mode === "login" && <button type="button" onClick={() => { setMode("signup"); setError(""); }} className="block cursor-pointer hover:underline">Need an account? Sign up</button>}
          {mode !== "login" && <button type="button" onClick={() => { setMode("login"); setError(""); }} className="block cursor-pointer hover:underline">Back to sign in</button>}
        </div>
      </div>
    </div>
  );
}
