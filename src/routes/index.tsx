/**
 * Homepage — Sutura Market Connect
 * Sections: Hero → Category Shortcuts → Trending Sellers → Featured Products → City Explorer → Open Your Store CTA
 * Context-aware: approved/pending seller sees dashboard CTA; guest/buyer sees browse + register CTAs.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeleton } from "@/components/LoadingSpinner";
import { SellerCard } from "@/components/SellerCard";
import { WelcomeModal } from "@/components/WelcomeModal";
import { ExploreStates } from "@/components/ExploreStates";
import { useCity } from "@/lib/cityContext";
import { useAuth } from "@/lib/authContext";
import { useSellerProfile } from "@/lib/sellerProfile";
import { iconFor, hausaFor } from "@/lib/categories";
import { Search, ArrowRight, Store, LayoutGrid, ChevronRight } from "lucide-react";
import { getTrendingSellers } from "@/lib/homepage-cms";

import { assertLaunchGate } from "@/lib/launchGate";
export const Route = createFileRoute("/")({ beforeLoad: assertLaunchGate, component: Index });

// ─── helpers ────────────────────────────────────────────────────────────────

function useSection(sections: any[] | undefined, key: string) {
  return sections?.find((s: any) => s.key === key && s.is_visible !== false);
}

// Skeleton rows for sellers while loading
function SellerSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border-warm bg-card animate-pulse">
      <div className="flex items-start gap-3 p-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-muted" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
        </div>
      </div>
      <div className="h-9 border-t border-border-warm bg-surface-warm/60" />
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

function Index() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const { selectedCity: city } = useCity();
  const { user, isReady } = useAuth();
  const { seller, loading: sellerLoading } = useSellerProfile();

  // Is the current user a seller (any status)?
  const isSeller = isReady && !sellerLoading && !!seller;
  // Only hide "Open your store" CTA when we know for sure the user is a seller
  const showSellerCTA = isReady && !sellerLoading && !seller;

  // ── data ──────────────────────────────────────────────────────────────────

  const { data: sections } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("homepage_sections").select("*")
        .eq("is_visible", true).order("sort_order")
        .abortSignal(AbortSignal.timeout(8000));
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000, retry: 1,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order")
        .abortSignal(AbortSignal.timeout(8000));
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000, retry: 1,
  });

  const { data: trendingSellers, isLoading: sellersLoading } = useQuery({
    queryKey: ["trending-sellers-home", city],
    queryFn: async () => {
      // Use CMS-managed list first
      const cms = await getTrendingSellers(6);
      if (cms.length > 0) {
        // Optionally filter by city if one is selected
        if (city !== "All") {
          const { data: filtered } = await supabase
            .from("sellers")
            .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
            .in("id", cms.map((s) => s.seller_id))
            .eq("city", city)
            .abortSignal(AbortSignal.timeout(8000));
          if (filtered && filtered.length > 0) return filtered;
        }
        return cms.map((s) => ({
          id: s.seller_id, slug: s.slug, business_name: s.business_name,
          category: s.category, city: "", profile_photo_url: s.profile_photo_url,
          is_verified: false, rating: null,
        }));
      }
      // Fallback: live query ordered by rating
      let qb = supabase.from("sellers")
        .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
        .eq("is_blocked", false).eq("verification_status", "approved")
        .order("is_verified", { ascending: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }).limit(6);
      if (city !== "All") qb = qb.eq("city", city);
      const { data, error } = await qb.abortSignal(AbortSignal.timeout(8000));
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000, retry: 1,
  });

  const { data: sellerCount } = useQuery({
    queryKey: ["seller-count"],
    queryFn: async () => {
      const { count } = await supabase.from("sellers")
        .select("id", { count: "exact", head: true })
        .eq("is_blocked", false).eq("verification_status", "approved");
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["featured-products-home", city],
    queryFn: async () => {
      const buildFeatured = () => {
        let qb = supabase.from("products")
          .select("id, name, price, image_url, stock_status, is_featured, featured_order, status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number, is_blocked, verification_status)")
          .eq("is_featured", true).eq("status", "active")
          .eq("sellers.is_blocked", false).eq("sellers.verification_status", "approved")
          .order("featured_order").limit(8);
        if (city !== "All") qb = qb.eq("sellers.city", city);
        return qb.abortSignal(AbortSignal.timeout(8000));
      };
      const buildRecent = () => {
        let qb = supabase.from("products")
          .select("id, name, price, image_url, stock_status, status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number, is_blocked, verification_status)")
          .eq("status", "active").eq("sellers.is_blocked", false).eq("sellers.verification_status", "approved")
          .order("created_at", { ascending: false }).limit(8);
        if (city !== "All") qb = qb.eq("sellers.city", city);
        return qb.abortSignal(AbortSignal.timeout(8000));
      };
      const [f, r] = await Promise.all([buildFeatured(), buildRecent()]);
      if (f.data && f.data.length > 0) return f.data;
      if (r.error) throw r.error;
      return r.data ?? [];
    },
    staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000, retry: 1,
  });

  const featuredSection = useSection(sections, "featured_products");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav({ to: "/search", search: { q: q.trim(), city: city !== "All" ? city : undefined } });
  };

  const hasSellers  = (trendingSellers?.length ?? 0) > 0;
  const hasProducts = (featuredProducts?.length ?? 0) > 0;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <WelcomeModal />
      <TopBar />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "#1A0B08",
          // Warm radial glow from bottom-right
          backgroundImage: [
            "radial-gradient(ellipse 80% 60% at 75% 110%, rgba(168,68,42,0.38) 0%, transparent 60%)",
            "radial-gradient(ellipse 50% 40% at 20% 0%,  rgba(120,60,20,0.22) 0%, transparent 55%)",
            // Subtle geometric crosshatch pattern
            "repeating-linear-gradient(45deg,  rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 28px)",
            "repeating-linear-gradient(-45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 28px)",
          ].join(", "),
        }}
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-16 text-center sm:py-24">
          {/* eyebrow */}
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9674A]" />
            Arewa Market
          </p>

          {/* headline */}
          <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
            {isSeller
              ? <>Welcome back,<br /><span className="text-[#D97C5A]">{seller!.business_name}</span></>
              : <>Authentic goods from<br /><span className="text-[#D97C5A]">northern Nigeria</span></>
            }
          </h1>

          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            {isSeller
              ? "Manage your store, track your products, and connect with buyers."
              : `Discover handcrafted fashion, food, beauty and more from ${sellerCount ? sellerCount.toLocaleString() : "verified"} trusted sellers.`
            }
          </p>

          {/* search bar (buyers only) or dashboard link (sellers) */}
          {isSeller ? (
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-[#C9674A] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#B85C41] active:scale-95"
              >
                <LayoutGrid className="h-4 w-4" /> Go to my dashboard
              </Link>
              <Link
                to="/seller/products"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/15"
              >
                My products <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={submitSearch} className="mt-8 flex w-full max-w-lg gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search products, sellers…"
                    className="h-12 w-full rounded-full border border-white/15 bg-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/40 backdrop-blur-sm transition focus:border-white/30 focus:bg-white/15 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 shrink-0 rounded-full bg-[#C9674A] px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#B85C41] active:scale-95"
                >
                  Search
                </button>
              </form>

              <div className="mt-5 flex items-center gap-4">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-white"
                >
                  Browse all products <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <span className="text-white/20">·</span>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D97C5A] transition hover:text-[#E8906E]"
                >
                  <Store className="h-3.5 w-3.5" /> Sell on Sutura
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── CATEGORY SHORTCUTS ───────────────────────────────────────────── */}
      {(categories?.length ?? 0) > 0 && (
        <section className="border-b border-border-warm bg-card">
          <div className="mx-auto max-w-6xl px-5">
            <div className="flex gap-3 overflow-x-auto py-4 scrollbar-hide">
              {(categories ?? []).map((cat: any) => {
                const icon = iconFor(cat.name);
                return (
                  <Link
                    key={cat.id}
                    to="/category/$slug"
                    params={{ slug: cat.slug }}
                    className="group flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border-warm bg-background px-4 py-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-warm active:scale-95"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${icon.containerClass}`}>
                      <icon.Component size={24} />
                    </div>
                    <span className="whitespace-nowrap text-[11px] font-semibold text-espresso">{cat.name}</span>
                    {hausaFor(cat.name) && (
                      <span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-wide text-sage-deep/70">
                        {hausaFor(cat.name)}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* All products shortcut */}
              <Link
                to="/explore"
                className="group flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border-warm bg-background px-4 py-3 transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-warm">
                  <ArrowRight className="h-5 w-5 text-sage-deep" />
                </div>
                <span className="whitespace-nowrap text-[11px] font-semibold text-muted-foreground">All</span>
                <span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-wide text-sage-deep/70">Duka</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── TRENDING SELLERS ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-deep">
              {city !== "All" ? city : "This week"}
            </p>
            <h2 className="mt-1 font-display text-3xl text-espresso">Trending sellers</h2>
          </div>
          <Link
            to="/sellers"
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-sage-deep transition hover:text-primary"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {sellersLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SellerSkeleton key={i} />)}
          </div>
        ) : hasSellers ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trendingSellers!.map((s: any) => (
              <SellerCard
                key={s.id}
                slug={s.slug}
                business_name={s.business_name}
                category={s.category}
                city={s.city}
                profile_photo_url={s.profile_photo_url}
                is_verified={s.is_verified}
                rating={s.rating}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border-warm bg-card px-6 py-12 text-center">
            <p className="font-display text-xl text-espresso">No sellers yet{city !== "All" ? ` in ${city}` : ""}</p>
            <p className="mt-1 text-sm text-muted-foreground">Be the first to open a store.</p>
            <Link
              to="/register"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Store className="h-4 w-4" /> Open your store
            </Link>
          </div>
        )}
      </section>

      {/* ── FEATURED PRODUCTS ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-deep">Just in</p>
            <h2 className="mt-1 font-display text-3xl text-espresso">
              {featuredSection?.title ?? "Featured products"}
            </h2>
          </div>
          <Link
            to="/explore"
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-sage-deep transition hover:text-primary"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : hasProducts ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts!.map((p: any, i: number) => {
              const s = p.sellers;
              return (
                <div key={p.id} className="card-enter" style={{ animationDelay: `${i * 0.05}s` }}>
                  <ProductCard
                    id={p.id} name={p.name} price={Number(p.price)}
                    image_url={p.image_url} stock_status={p.stock_status}
                    status={p.status} seller_id={p.seller_id}
                    seller_name={s?.business_name} seller_city={s?.city}
                    seller_slug={s?.slug} whatsapp_number={s?.whatsapp_number ?? ""}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border-warm bg-card px-6 py-12 text-center">
            <p className="font-display text-xl text-espresso">No products yet{city !== "All" ? ` in ${city}` : ""}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {city !== "All" ? `Try switching to "All states" above.` : "Check back soon — sellers are adding products."}
            </p>
          </div>
        )}

        {hasProducts && (
          <div className="mt-8 text-center">
            <Link to="/explore">
              <button className="inline-flex items-center gap-2 rounded-full border border-border-warm bg-card px-6 py-3 text-sm font-medium text-espresso shadow-warm transition hover:bg-surface-warm hover:shadow-warm-lg active:scale-95">
                Browse all products <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        )}
      </section>

      {/* ── CITY EXPLORER ────────────────────────────────────────────────── */}
      <ExploreCities />

      {/* ── OPEN YOUR STORE CTA ──────────────────────────────────────────── */}
      {showSellerCTA && (
        <section
          className="relative overflow-hidden"
          style={{
            background: "#1A0B08",
            backgroundImage: [
              "radial-gradient(ellipse 70% 80% at 100% 50%, rgba(168,68,42,0.30) 0%, transparent 60%)",
              "repeating-linear-gradient(45deg,  rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 32px)",
              "repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 32px)",
            ].join(", "),
          }}
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-16 text-center sm:py-20">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#D97C5A]">
              For sellers · Masu kasuwanci
            </p>
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              Ready to reach more customers?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
              List your products, get discovered by thousands of buyers, and connect directly over WhatsApp — all for free.
            </p>
            {sellerCount && sellerCount > 0 && (
              <p className="mt-2 text-xs text-white/40">
                Join {sellerCount.toLocaleString()} verified sellers already on Sutura
              </p>
            )}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#C9674A] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#B85C41] active:scale-95"
              >
                <Store className="h-4 w-4" /> Open your store — it's free
              </Link>
              {!user && (
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/8 px-6 py-3.5 text-sm font-medium text-white/80 transition hover:bg-white/15"
                >
                  Already have an account? Sign in
                </Link>
              )}
            </div>
          </div>
        </section>
      )}

      <Footer />
      <BottomNav />

      {/* ── FLOATING "OPEN YOUR STORE" BUTTON (mobile, non-sellers only) ── */}
      {showSellerCTA && (
        <div className="fixed bottom-20 right-4 z-40 sm:hidden">
          <Link
            to="/register"
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-warm-lg transition hover:bg-primary/90 active:scale-95"
            aria-label="Open your store"
          >
            <Store className="h-4 w-4" />
            <span>Sell here</span>
          </Link>
        </div>
      )}
    </div>
  );
}
