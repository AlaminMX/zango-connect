/**
 * Launch Gate — single source of truth for the pre-launch marketplace lock.
 *
 * SCOPE: this gate ONLY blocks the public marketplace (browse / search /
 * storefront / category / product-detail pages). It never touches auth,
 * the seller dashboard, product management, verification, or the vendor
 * card generator — those routes simply never call `assertLaunchGate`.
 * A vendor's shop is open the whole time; only the marketplace is closed.
 *
 * There is no manual on/off switch. `isMarketplaceOpen()` is derived from
 * `LAUNCH_DATE` on every call, so the gate drops itself the instant real
 * time crosses that timestamp — no deploy, no flag to remember to flip,
 * no risk of shipping launch day with the gate still closed.
 *
 * To move launch day: change `LAUNCH_DATE`. That's the only edit needed.
 */
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/** Single config value. Change this — and only this — to move launch day. */
export const LAUNCH_DATE = "2026-07-25T09:00:00+01:00";

/** True once real time has passed LAUNCH_DATE. Always live — never cache this. */
export function isMarketplaceOpen(): boolean {
  return Date.now() >= new Date(LAUNCH_DATE).getTime();
}

/**
 * The one vendor allowed to browse the live marketplace pre-launch, for
 * end-to-end testing. Matched by business name (case/whitespace-insensitive),
 * not a hardcoded user ID — nothing to update if the Nexel test account is
 * ever recreated, and no placeholder ID that can be shipped unfilled.
 */
const FOUNDING_TESTER_NAME = "nexel";

export function isFoundingTesterSeller(businessName: string | null | undefined): boolean {
  return (businessName ?? "").trim().toLowerCase() === FOUNDING_TESTER_NAME;
}

/**
 * Client-side bypass check for nav/UI polish (show/hide marketplace links).
 * Pass `sellerBusinessName` straight from the shared `useSellerProfile`
 * query — never fetch it separately here, that's exactly the kind of
 * duplicate-call auth race this codebase has already fixed once.
 */
export function canBypassLaunchGate(isAdmin: boolean, sellerBusinessName?: string | null): boolean {
  if (isMarketplaceOpen()) return true;
  if (isAdmin) return true;
  if (isFoundingTesterSeller(sellerBusinessName)) return true;
  return false;
}

/**
 * `beforeLoad` guard for gated (public-marketplace-only) routes.
 *
 * IMPORTANT — SSR is fail-closed, not fail-open. This app server-renders
 * every request (see src/server.ts), and the Supabase client only has a
 * session on the client (auth storage is `localStorage`-only — see
 * integrations/supabase/client.ts — there's no cookie for the server to
 * read). That means the server can NEVER identify who's asking.
 *
 * Given that, the only safe default is to block: on the server we redirect
 * to /coming-soon unconditionally while the gate is closed, for EVERY
 * visitor — anonymous, blocked vendor, admin, even the Nexel test account.
 * Yes, that means an allowed user's very first byte is the pre-launch page.
 * We pass their intended URL through as `?from=`, and /coming-soon
 * self-corrects them straight back to it the moment the client hydrates
 * and confirms they're allowed (see ComingSoonPage). That one-frame
 * redirect is the acceptable cost — the alternative is serving real
 * marketplace HTML to curl, scrapers, and JS-disabled visitors, which is
 * the actual leak this replaces.
 */
export async function assertLaunchGate(opts?: { location?: { href: string } }) {
  if (isMarketplaceOpen()) return;

  const from = opts?.location?.href;

  if (typeof window === "undefined") {
    throw redirect({ to: "/coming-soon", search: from ? { from } : undefined });
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id ?? null;

  if (userId) {
    const [{ data: roleRow }, { data: sellerRow }] = await Promise.all([
      // Admins bypass. Same `has_role` check the app uses everywhere.
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle(),
      // Founding-vendor bypass, matched by name — see isFoundingTesterSeller.
      supabase.from("sellers").select("business_name").eq("user_id", userId).maybeSingle(),
    ]);
    if (roleRow) return;
    if (isFoundingTesterSeller(sellerRow?.business_name)) return;
  }

  throw redirect({ to: "/coming-soon", search: from ? { from } : undefined });
}
