/**
 * /explore — discovery hub. Sticky search, trending sellers,
 * category quick filter, product grid with "Load more".
 *
 * Query strategy: two separate flat queries (sellers then products),
 * joined in JS. This avoids Supabase join-filter bugs that affect
 * both anon and authenticated users.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeleton } from "@/components/LoadingSpinner";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useCity } from "@/lib/cityContext";
import { getTrendingSellers } from "@/lib/homepage-cms";
import { getCategoryIcon } from "@/lib/category-icons";

export const Route = createFileRoute("/explore")({ component: Explore });

const PAGE_SIZE = 12;

function Explore() {
  const nav = useNavigate();
  const { selectedCity } = useCity();
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE_SIZE);

  // ── Categories ──────────────────────────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ["explore-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("sort_order")
        .abortSignal(AbortSignal.timeout(8000));
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // ── States (from actual seller data so filter only shows populated states) ──
  const { data: states = [] } = useQuery<string[]>({
    queryKey: ["explore-states"],
    queryFn: async (): Promise<string[]> => {
      // First try cities_with_stats view (has seller counts)
      const { data: cityData } = await (supabase as any)
        .from("cities_with_stats")
        .select("state, sellers_count")
        .eq("is_active", true);
      if (cityData && cityData.length > 0) {
        // Only include states that have at least one seller
        const withSellers = cityData.filter((c: any) => (c.sellers_count ?? 0) > 0);
        const stateSet = [...new Set(withSellers.map((c: any) => c.state as string))];
        if (stateSet.length > 0) return stateSet.sort();
      }
      // Fallback: distinct states from sellers directly
      const { data: sellerData } = await supabase
        .from("sellers")
        .select("state")
        .eq("verification_status", "approved")
        .eq("status", "active")
        .eq("is_blocked", false)
        .not("state", "is", null)
        .abortSignal(AbortSignal.timeout(8000));
      return [...new Set((sellerData ?? []).map((s: any) => s.state as string).filter(Boolean))].sort();
    },
    staleTime: 10 * 60_000,
  });

  // ── Trending sellers (CMS-managed with live fallback) ───────────────────────
  const { data: trending = [] } = useQuery({
    queryKey: ["trending-sellers"],
    queryFn: async () => {
      const cms = await getTrendingSellers(3);
      if (cms.length > 0) return cms;
      const { data } = await supabase
        .from("sellers")
        .select("id, slug, business_name, category, profile_photo_url")
        .eq("verification_status", "approved")
        .eq("status", "active")
        .eq("is_blocked", false)
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(3)
        .abortSignal(AbortSignal.timeout(8000));
      return (data ?? []).map((s: any) => ({
        id: s.id, seller_id: s.id, display_order: 0,
        business_name: s.business_name, category: s.category,
        profile_photo_url: s.profile_photo_url, slug: s.slug,
      }));
    },
    staleTime: 5 * 60_000,
  });

  // ── Main product feed ────────────────────────────────────────────────────────
  // Step 1: fetch approved sellers matching current filters
  // Step 2: fetch active products for those seller IDs
  // Both are flat queries — no joins — to avoid Supabase anon join-filter bugs.
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["explore-products", selectedCity, activeCat, activeState],
    queryFn: async () => {
      // ── 1. Sellers ──────────────────────────────────────────────────────
      let sq = supabase
        .from("sellers")
        .select("id, business_name, city, state, slug, whatsapp_number, category")
        .eq("verification_status", "approved")
        .eq("status", "active")
        .eq("is_blocked", false);

      // City filter — only when a real city is chosen (not "All" / empty)
      const cityFilter = selectedCity && selectedCity !== "All" ? selectedCity : null;
      if (cityFilter) sq = sq.eq("city", cityFilter);

      if (activeState) sq = sq.eq("state", activeState);

      if (activeCat) {
        const cat = (categories as any[]).find((c) => c.slug === activeCat);
        if (cat?.name) sq = sq.eq("category", cat.name);
      }

      const { data: sellersData, error: sellersErr } = await sq
        .limit(500)
        .abortSignal(AbortSignal.timeout(10_000));

      if (sellersErr) {
        console.error("[explore] sellers query failed:", sellersErr);
        throw sellersErr;
      }

      const sellers = sellersData ?? [];
      if (sellers.length === 0) return [];

      const sellerMap = new Map<string, any>(sellers.map((s) => [s.id, s]));
      const sellerIds = [...sellerMap.keys()];

      // ── 2. Products ─────────────────────────────────────────────────────
      const { data: productsData, error: productsErr } = await supabase
        .from("products")
        .select("id, name, price, image_url, stock_status, is_featured, featured_order, seller_id")
        .eq("status", "active")
        .in("seller_id", sellerIds)
        .limit(200)
        .abortSignal(AbortSignal.timeout(10_000));

      if (productsErr) {
        console.error("[explore] products query failed:", productsErr);
        throw productsErr;
      }

      const rows = (productsData ?? []).map((p: any) => ({
        ...p,
        sellers: sellerMap.get(p.seller_id) ?? null,
      }));

      // Featured products first (ordered by featured_order), then shuffle the rest
      const featured = rows
        .filter((r) => r.is_featured)
        .sort((a, b) => (a.featured_order ?? 0) - (b.featured_order ?? 0));
      const rest = rows.filter((r) => !r.is_featured);
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      return [...featured, ...rest];
    },
  });

  const visible = useMemo(() => products.slice(0, shown), [products, shown]);

  const clearFilters = () => {
    setActiveCat(null);
    setActiveState(null);
    setShown(PAGE_SIZE);
  };

  const hasFilters = !!(activeCat || activeState || (selectedCity && selectedCity !== "All"));

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav({ to: "/search", search: { q: q.trim(), city: selectedCity !== "All" ? selectedCity : undefined } });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      {/* Sticky search bar */}
      <div className="sticky top-16 z-30 border-b border-border-warm bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 py-3">
          <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-full border border-border-warm bg-card px-3 py-1.5 shadow-warm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, sellers, categories…"
              className="min-h-[36px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="Search marketplace"
            />
            <Button type="submit" size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Search
            </Button>
          </form>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-6">
        <BackButton fallback="/" />

        {/* Trending sellers */}
        {trending.length > 0 && (
          <section className="mt-4">
            <div className="mb-3 flex items-baseline justify-between">
              <div>
                <h2 className="font-display text-2xl text-espresso">Trending sellers</h2>
                <p className="text-[11px] text-muted-foreground">Shahararrun Masu Kasuwa</p>
              </div>
              <Link to="/sellers" className="text-xs font-semibold text-primary hover:underline">See all</Link>
            </div>
            <div className="grid grid-cols-3 gap-4 md:gap-6">
              {trending.map((s: any) => (
                <Link key={s.seller_id ?? s.id} to="/store/$slug" params={{ slug: s.slug }} className="group flex flex-col items-center text-center">
                  <div className="h-20 w-20 overflow-hidden rounded-full bg-surface-warm ring-2 ring-border-warm transition group-hover:ring-primary">
                    {s.profile_photo_url
                      ? <img src={s.profile_photo_url} alt={s.business_name} className="h-full w-full object-cover" loading="lazy" />
                      : <div className="flex h-full w-full items-center justify-center font-display text-2xl text-primary">{s.business_name?.charAt(0)}</div>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold text-espresso">{s.business_name}</p>
                  <p className="line-clamp-1 text-[10px] text-muted-foreground">{s.category}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* State filter pills */}
        {states.length > 0 && (
          <section className="mt-6">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Filter by state</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <CatPill active={activeState === null} onClick={() => { setActiveState(null); setShown(PAGE_SIZE); }}>All states</CatPill>
              {states.map((s) => (
                <CatPill key={s} active={activeState === s} onClick={() => { setActiveState(s); setShown(PAGE_SIZE); }}>{s}</CatPill>
              ))}
            </div>
          </section>
        )}

        {/* Category filter pills */}
        {(categories as any[]).length > 0 && (
          <section className="mt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Filter by category</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <CatPill active={activeCat === null} onClick={() => { setActiveCat(null); setShown(PAGE_SIZE); }}>All</CatPill>
              {(categories as any[]).map((c) => (
                <CatPill key={c.id} active={activeCat === c.slug} onClick={() => { setActiveCat(c.slug); setShown(PAGE_SIZE); }} categoryName={c.name}>
                  {c.name}
                </CatPill>
              ))}
            </div>
          </section>
        )}

        {/* Products grid */}
        <section className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">Something went wrong loading products.</p>
              <button type="button" onClick={clearFilters} className="mt-3 text-xs font-semibold text-primary hover:underline">Try clearing filters</button>
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">No products found{hasFilters ? " for this filter" : ""}.</p>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="mt-3 text-xs font-semibold text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">{products.length} product{products.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {visible.map((p: any) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    price={Number(p.price ?? 0)}
                    image_url={p.image_url}
                    stock_status={p.stock_status}
                    seller_id={p.seller_id}
                    seller_name={p.sellers?.business_name}
                    seller_city={p.sellers?.city}
                    seller_slug={p.sellers?.slug}
                    whatsapp_number={p.sellers?.whatsapp_number}
                  />
                ))}
              </div>
              {products.length > shown && (
                <div className="mt-8 text-center">
                  <Button onClick={() => setShown((n) => n + PAGE_SIZE)} variant="outline" className="min-h-[44px] rounded-full border-border-warm bg-card px-8">
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

function CatPill({
  active, onClick, children, categoryName,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; categoryName?: string;
}) {
  const Icon = categoryName ? getCategoryIcon(categoryName) : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] shrink-0 rounded-full border px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-warm bg-card text-espresso hover:border-primary"
      }`}
    >
      {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
      <span>{children}</span>
    </button>
  );
}
