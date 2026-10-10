"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

type AccountType = "creator" | "manager";
type CurrentUser = { id: string; email: string; accountType: AccountType };

// Optimistic, client-side routing: sends an account to its own area if it lands on the
// other one. The real enforcement lives server-side, in each API route and in
// app/manager's own access check, so this is UX, not the security boundary.
function usePortalGuard(user: CurrentUser | null | undefined) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!user) return;
    const onManagerPortal = pathname === "/manager" || pathname.startsWith("/manager/");
    if (user.accountType === "manager" && !onManagerPortal) router.replace("/manager");
    else if (user.accountType === "creator" && onManagerPortal) router.replace("/");
  }, [user, pathname, router]);
}

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  usePortalGuard(user);

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
  const [accountType, setAccountType] = useState<AccountType>("creator");
  const [workspaceName, setWorkspaceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const payload = mode === "signup"
        ? { email, password, accountType, ...(accountType === "manager" ? { workspaceName } : {}) }
        : { email, password, accountType };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) { setError(body.error ?? "Something went wrong. Please try again."); return; }
      onSignedIn(body.user);
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setSubmitting(false); }
  }

  const titles: Record<Mode, string> = { login: "Sign in to CollabFlow", signup: "Create your account" };
  const submitLabels: Record<Mode, string> = { login: "Sign in", signup: "Create account" };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f4f9] p-4 text-[#101c40]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-[0_8px_32px_#20345c08]">
        <h1 className="text-xl font-bold tracking-tight">{titles[mode]}</h1>
        <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="mt-5 space-y-4">
          <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-2">
            {(["creator", "manager"] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={accountType === type}
                onClick={() => setAccountType(type)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${accountType === type ? "border-[#243657] bg-[#243657] text-white" : "border-slate-200 bg-white text-[#405579] hover:bg-slate-50"}`}
              >
                {mode === "signup" ? (type === "creator" ? "I'm a Creator" : "I'm a Manager") : (type === "creator" ? "Sign in as Creator" : "Sign in as Manager")}
              </button>
            ))}
          </div>
          <label className="block text-xs text-[#405579]">Email
            <input type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600" />
          </label>
          <label className="block text-xs text-[#405579]">Password
            <input type="password" required minLength={8} maxLength={200} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600" />
          </label>
          {mode === "signup" && accountType === "manager" && (
            <label className="block text-xs text-[#405579]">Agency name
              <input type="text" required maxLength={120} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Acme Talent Agency" className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-blue-600" />
            </label>
          )}
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
