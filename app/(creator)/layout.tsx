import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAccountType } from "@/lib/auth/account";

// Server-side guard (WP1.6 counterpart): bounces manager accounts out of the creator
// portal. Unauthenticated visitors pass through unchanged — the root AuthGate still
// shows the login screen for them, exactly as before this route group existed.
export default async function CreatorLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user) {
    const accountType = await getAccountType(user.sub);
    if (accountType === "manager") redirect("/manager");
  }
  return <>{children}</>;
}
