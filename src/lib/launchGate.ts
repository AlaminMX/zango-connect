/**
 * Launch Gate — single source of truth for the pre-launch marketplace lock.
 *
 * Flip `MARKETPLACE_OPEN` to `true` on launch day and the gate disappears
 * everywhere (route guards + nav polish) with no other code changes.
 *
 * `PRELAUNCH_ALLOWLIST` + `canBypassLaunchGate` stay in the codebase
 * post-launch (dormant) so they're ready to reuse for future private betas
 * or maintenance windows.
 */
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const MARKETPLACE_OPEN = false;

/** ISO datetime — used by the /coming-soon countdown. Update in one place. */
export const LAUNCH_DATE = "2026-07-26T09:00:00+01:00";

/**
 * Supabase auth user IDs allowed through the gate while it's closed.
 * Admins bypass automatically (via `has_role`) — this list is only for
 * non-admin bypass users (e.g. the Nexel team member).
 */
export const PRELAUNCH_ALLOWLIST: string[] = [
  "REPLACE_WITH_ADMIN_USER_ID",
  "REPLACE_WITH_NEXEL_USER_ID",
];

export function canBypassLaunchGate(
  userId: string | null | undefined,
  isAdmin: boolean,
): boolean {
  if (MARKETPLACE_OPEN) return true;
  if (isAdmin) return true;
  if (userId && PRELAUNCH_ALLOWLIST.includes(userId)) return true;
  return false;
}

/**
 * `beforeLoad` guard for gated routes. Runs client-side (SSR is skipped so
 * we don't redirect during prerender when there's no session storage).
 * Because it awaits the session check, TanStack Router does NOT mount the
 * route component until we know — no flash on hard refresh or in-app nav.
 */
export async function assertLaunchGate() {
  if (MARKETPLACE_OPEN) return;

  // SSR / prerender has no localStorage session — defer to client run.
  if (typeof window === "undefined") return;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;

  if (userId && PRELAUNCH_ALLOWLIST.includes(userId)) return;

  if (userId) {
    // Admins bypass. Same `has_role` check the app uses everywhere.
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleRow) return;
  }

  throw redirect({ to: "/coming-soon" });
}
