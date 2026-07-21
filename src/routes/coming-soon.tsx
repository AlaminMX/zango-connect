/**
 * /coming-soon — pre-launch landing page shown to buyers (and guests) while
 * `MARKETPLACE_OPEN` is false. Sellers can still reach their dashboard, admin,
 * and auth flows; those routes are explicitly not gated.
 *
 * Not styled as an error page — this is an invitation.
 */
import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LayoutDashboard, Package, Sparkles } from "lucide-react";
import { LAUNCH_DATE } from "@/lib/launchGate";

export const Route = createFileRoute("/coming-soon")({
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

interface Remaining { d: number; h: number; m: number; s: number; done: boolean }

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

  useEffect(() => {
    const id = setInterval(() => setT(computeRemaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

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
            The Market Gates<br className="hidden sm:block" /> Are Almost Open
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-espresso/80 sm:text-lg">
            Welcome to Zango. Your store has been created successfully and you're
            officially one of our Founding Vendors. You can continue uploading
            products, editing your store, and preparing for launch while we
            finish opening the marketplace. Customers will begin discovering
            your store in 5 days.
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
              to="/dashboard"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 active:scale-[0.98]"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
            <Link
              to="/seller/products"
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
