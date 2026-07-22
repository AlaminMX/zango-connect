/**
 * /coming-soon — pre-launch landing page shown to buyers (and guests) while
 * the marketplace is closed (see `isMarketplaceOpen` in launchGate.ts).
 * Sellers can still reach their dashboard, admin, and auth flows; those
 * routes are explicitly not gated.
 *
 * Not styled as an error page — this is an invitation.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, Sparkles } from "lucide-react";
import { LAUNCH_DATE, isMarketplaceOpen, canBypassLaunchGate } from "@/lib/launchGate";
import { useAuth } from "@/lib/authContext";
import { useSellerProfile } from "@/lib/sellerProfile";

/**
 * Only ever an internal path — never hand this straight to navigation.
 * `from` arrives as a raw query string value, so it's attacker-controlled;
 * reject anything that isn't a same-origin path to rule out an open redirect
 * (`?from=https://evil.com`, `?from=//evil.com`).
 */
function safeFrom(from: string | undefined): string {
  if (!from) return "/";
  if (!from.startsWith("/") || from.startsWith("//") || from.includes("://")) return "/";
  if (from.startsWith("/coming-soon")) return "/"; // never bounce back into a loop
  return from;
}

export const Route = createFileRoute("/coming-soon")({
  validateSearch: (search: Record<string, unknown>): { from?: string } => ({
    from: typeof search.from === "string" ? search.from : undefined,
  }),
  head: () => ({
    meta: [
      { title: "ZANGO — Opening Soon" },
      {
        name: "description",
        content:
          "The ZANGO marketplace opens in a few days. Founding vendors can keep uploading products and preparing their stores while we finish opening the gates.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ComingSoonPage,
});

interface Remaining {
  d: number;
  h: number;
  m: number;
  s: number;
  done: boolean;
}

function computeRemaining(target: number): Remaining {
  const diff = target - Date.now();
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true };
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { d, h, m, s, done: false };
}

function ComingSoonPage() {
  const target = new Date(LAUNCH_DATE).getTime();
  const [t, setT] = useState<Remaining>(() => computeRemaining(target));
  const nav = useNavigate();
  const { from: rawFrom } = Route.useSearch();
  const dest = safeFrom(rawFrom);

  const { user, isReady, isAdmin } = useAuth();
  const { seller, loading: sellerLoading } = useSellerProfile();

  // Logged-out visitors have no dashboard or product list to go to — send
  // them to vendor onboarding instead, not into the /auth sign-in wall
  // that /dashboard and /seller/products bounce unauthenticated users to.
  // Once logged in, both buttons behave normally.
  const loggedIn = isReady && !!user;
  const dashboardHref = loggedIn ? "/dashboard" : "/register";
  const uploadProductsHref = loggedIn ? "/seller/products" : "/register";

  useEffect(() => {
    // If someone lands here after launch has already passed, don't even
    // flash the countdown — bounce straight to the (now open) destination.
    if (isMarketplaceOpen()) {
      nav({ href: dest, replace: true });
      return;
    }
    const id = setInterval(() => {
      const remaining = computeRemaining(target);
      setT(remaining);
      // Countdown hit zero while the page was open — hide it automatically,
      // no manual refresh required.
      if (remaining.done) {
        clearInterval(id);
        nav({ href: dest, replace: true });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [target, nav, dest]);

  useEffect(() => {
    // SSR fails closed and can't tell admins/Nexel apart from anyone else
    // (see assertLaunchGate) — every gated request lands here first. Once
    // the client has a real session, self-correct straight back to `dest`
    // for anyone who was actually allowed through. Wait for both auth and
    // the seller lookup to settle so an allowed vendor isn't judged before
    // their business_name has loaded.
    if (!isReady || sellerLoading) return;
    if (canBypassLaunchGate(isAdmin, seller?.business_name)) {
      nav({ href: dest, replace: true });
    }
  }, [isReady, isAdmin, sellerLoading, seller, dest, nav]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#F8EDD9] via-[#F1DBB4] to-[#E8B87A]">
      {/* Decorative warm-glow blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-sage/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-80 w-80 rounded-full bg-[#C97C4A]/20 blur-3xl" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-16 sm:px-8">
        <div className="w-full max-w-2xl text-center">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Founding Vendor
          </div>

          <h1 className="font-serif text-4xl leading-[1.08] text-espresso sm:text-5xl md:text-6xl">
            The Gates Are
            <br className="hidden sm:block" /> About To Open
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-lg font-medium leading-snug text-espresso/90 sm:text-xl">
            Your store is ready.
            <br className="hidden sm:block" /> The marketplace opens soon.
          </p>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-espresso/80 sm:text-lg">
            You're officially one of Zango's Founding Vendors. You can continue uploading products,
            editing your shop and preparing your business while we get everything ready for launch.
            When the countdown reaches zero, customers will be able to discover your products.
          </p>

          {/* Countdown */}
          <div className="mx-auto mt-10 grid max-w-md grid-cols-4 gap-2 sm:gap-3">
            {(
              [
                ["Days", t.d],
                ["Hours", t.h],
                ["Minutes", t.m],
                ["Seconds", t.s],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex flex-col items-center rounded-2xl border border-white/60 bg-white/70 px-2 py-3 shadow-[0_8px_24px_rgba(107,66,44,0.12)] backdrop-blur-sm sm:py-4"
              >
                <span className="font-serif text-3xl leading-none text-primary tabular-nums sm:text-4xl">
                  {String(value).padStart(2, "0")}
                </span>
                <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-espresso/60 sm:text-xs">
                  {label}
                </span>
              </div>
            ))}
          </div>

          {t.done && (
            <p className="mt-4 text-sm font-medium text-primary">
              The gates are open — refresh to enter.
            </p>
          )}

          {/* CTAs */}
          <div className="mx-auto mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to={dashboardHref}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
            <Link
              to={uploadProductsHref}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-espresso/20 bg-white/70 px-6 py-3 text-sm font-semibold text-espresso backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
            >
              <Package className="h-4 w-4" />
              Upload Products
            </Link>
          </div>

          <p className="mt-10 text-xs text-espresso/50">
            ZANGO · Northern Nigeria's marketplace, WhatsApp-first.
          </p>
        </div>
      </div>
    </main>
  );
}
