import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

// Server-side guard (WP1.6 counterpart): bounces sessions currently acting as a manager
// out of the creator portal. Unauthenticated visitors pass through unchanged — the root
// AuthGate still shows the login screen for them, exactly as before this route group existed.
export default async function CreatorLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (user?.role === "manager") redirect("/manager");
  return <>{children}</>;
}
