/**
 * /explore — modern marketplace discovery feed.
 *
 * The default feed uses cursor-based infinite loading so visitors immediately see
 * products and can keep scrolling without manual pagination. Search mode reuses
 * the shared marketplace search service and progressively requests larger result
 * windows as the user approaches the bottom of the page.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { PackageSearch, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeleton } from "@/components/LoadingSpinner";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { useCity } from "@/lib/cityContext";
import { getTrendingSellers } from "@/lib/homepage-cms";
import { getCategoryIcon } from "@/lib/category-icons";
import { MarketplaceSearchBox } from "@/components/search/MarketplaceSearchBox";
import { useMarketplaceSearch } from "@/hooks/use-marketplace-search";
import { assertLaunchGate } from "@/lib/launchGate";

export const Route = createFileRoute("/explore")({ beforeLoad: assertLaunchGate, component: Explore });

const PAGE_SIZE = 24;
type Cursor = { created_at: string; id: string } | null;
type ExploreProduct = {
  id: string;
  name: string;
  price: number | string | null;
  image_url: string | null;
  stock_status?: string | null;
  seller_id: string;
  created_at?: string | null;
  sellers?: {
    business_name?: string | null;
    city?: string | null;
    state?: string | null;
    slug?: string | null;
    whatsapp_number?: string | null;
    category?: string | null;
  } | null;
};

type ProductPage = { items: ExploreProduct[]; nextCursor: Cursor; hasMore: boolean };

function Explore() {
  const nav = useNavigate();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { selectedCity } = useCity();
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeState, setActiveState] = useState<string | null>(null);
  const [searchLimit, setSearchLimit] = useState(PAGE_SIZE);

  const selectedCityFilter = selectedCity && selectedCity !== "All" ? selectedCity : undefined;
  const isSearching = q.trim().length > 0;

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

  const activeCategoryName = activeCat ? (categories as any[]).find((c) => c.slug === activeCat)?.name : undefined;
  const filtersReady = !activeCat || Boolean(activeCategoryName);

  const { data: states = [] } = useQuery<string[]>({
    queryKey: ["explore-states"],
    queryFn: async (): Promise<string[]> => {
      const { data: cityData } = await (supabase as any)
        .from("cities_with_stats")
        .select("state, sellers_count")
        .eq("is_active", true)
        .abortSignal(AbortSignal.timeout(8000));
      if (cityData && cityData.length > 0) {
        const withSellers = cityData.filter((c: any) => (c.sellers_count ?? 0) > 0);
        const stateSet: string[] = [...new Set<string>(withSellers.map((c: any) => c.state as string))];
        if (stateSet.length > 0) return stateSet.sort();
      }
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

  const feedQuery = useInfiniteQuery<ProductPage>({
    queryKey: ["explore-feed", selectedCityFilter, activeState, activeCategoryName],
    enabled: !isSearching && filtersReady,
    initialPageParam: null as Cursor,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    queryFn: async ({ pageParam, signal }) => fetchExploreProducts({
      cursor: pageParam as Cursor,
      city: selectedCityFilter,
      state: activeState ?? undefined,
      category: activeCategoryName,
      signal,
    }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  const liveSearch = useMarketplaceSearch({
    query: q,
    city: selectedCityFilter,
    state: activeState ?? undefined,
    category: activeCategoryName,
    limit: searchLimit,
    includeSellers: false,
  });

  const feedProducts = useMemo(() => dedupeProducts(feedQuery.data?.pages.flatMap((page) => page.items) ?? []), [feedQuery.data]);
  const searchProducts = useMemo(() => dedupeProducts(liveSearch.data?.products ?? []), [liveSearch.data]);
  const products = isSearching ? searchProducts : feedProducts;
  const isInitialLoading = isSearching ? liveSearch.isLoading : feedQuery.isLoading;
  const isLoadingMore = isSearching ? liveSearch.isFetching && searchLimit > PAGE_SIZE : feedQuery.isFetchingNextPage;
  const hasMore = isSearching ? searchProducts.length >= searchLimit : Boolean(feedQuery.hasNextPage);
  const hasError = isSearching ? liveSearch.isError : feedQuery.isError;

  useEffect(() => {
    setSearchLimit(PAGE_SIZE);
  }, [q, selectedCityFilter, activeState, activeCategoryName]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || isInitialLoading || isLoadingMore || !hasMore || hasError) return;
        if (isSearching) setSearchLimit((limit) => limit + PAGE_SIZE);
        else void feedQuery.fetchNextPage();
      },
      { rootMargin: "900px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feedQuery, hasError, hasMore, isInitialLoading, isLoadingMore, isSearching]);

  const clearFilters = () => {
    setActiveCat(null);
    setActiveState(null);
  };

  const retry = () => {
    if (isSearching) void liveSearch.refetch();
    else void feedQuery.refetch();
  };

  const hasFilters = Boolean(activeCat || activeState || selectedCityFilter);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav({ to: "/search", search: { q: q.trim(), city: selectedCityFilter } });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="sticky top-16 z-30 border-b border-border-warm bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-5 py-3">
          <form onSubmit={submitSearch} className="flex items-center gap-2 rounded-full border border-border-warm bg-card px-3 py-1.5 shadow-warm">
            <MarketplaceSearchBox
              value={q}
              onChange={setQ}
              onSubmit={(value) => setQ(value)}
              isSearching={isSearching ? liveSearch.isFetching : feedQuery.isFetchingNextPage}
              placeholder="Search products, sellers, categories…"
              inputClassName="min-h-[36px]"
            />
            <Button type="submit" size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Search
            </Button>
          </form>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 py-6">
        <BackButton fallback="/" />

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

        {states.length > 0 && (
          <section className="mt-6">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Filter by state</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <CatPill active={activeState === null} onClick={() => setActiveState(null)}>All states</CatPill>
              {states.map((s) => (
                <CatPill key={s} active={activeState === s} onClick={() => setActiveState((cur) => (cur === s ? null : s))}>{s}</CatPill>
              ))}
            </div>
          </section>
        )}

        {(categories as any[]).length > 0 && (
          <section className="mt-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Filter by category</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <CatPill active={activeCat === null} onClick={() => setActiveCat(null)}>All</CatPill>
              {(categories as any[]).map((c) => (
                <CatPill key={c.id} active={activeCat === c.slug} onClick={() => setActiveCat((cur) => (cur === c.slug ? null : c.slug))} categoryName={c.name}>
                  {c.name}
                </CatPill>
              ))}
            </div>
          </section>
        )}

        <section className="mt-6" aria-busy={isInitialLoading || isLoadingMore}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {isSearching ? `Live results for "${q.trim()}"` : "Discover products"}
              {!isInitialLoading && !hasError ? ` · ${products.length} loaded` : ""}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="text-xs font-semibold text-primary hover:underline">
                Clear filters
              </button>
            )}
          </div>

          {hasError ? (
            <EmptyState
              title="Products could not be loaded"
              message="Please check your connection and try again. Your filters and search are still saved."
              action={<Button type="button" onClick={retry} variant="outline" className="rounded-full"><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>}
            />
          ) : isInitialLoading ? (
            <ProductGridSkeleton count={PAGE_SIZE} />
          ) : products.length === 0 ? (
            <EmptyState
              title={isSearching ? "No products found" : "No products available yet"}
              message={isSearching ? "Try a different keyword, remove a filter, or search for a broader product name." : "There are no active products to browse right now. Please check back later."}
              action={hasFilters || isSearching ? <Button type="button" onClick={() => { setQ(""); clearFilters(); }} variant="outline" className="rounded-full">Reset explore</Button> : undefined}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((p: ExploreProduct) => (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    price={Number(p.price ?? 0)}
                    image_url={p.image_url}
                    stock_status={p.stock_status ?? undefined}
                    seller_id={p.seller_id}
                    seller_name={p.sellers?.business_name ?? undefined}
                    seller_city={p.sellers?.city ?? undefined}
                    seller_slug={p.sellers?.slug ?? undefined}
                    whatsapp_number={p.sellers?.whatsapp_number ?? ""}
                  />
                ))}
              </div>

              {isLoadingMore && <div className="mt-4"><ProductGridSkeleton count={8} /></div>}
              {!hasMore && products.length > 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">You’ve reached the end of this feed.</p>
              )}
            </>
          )}
          <div ref={loadMoreRef} className="h-8" aria-hidden="true" />
        </section>
      </main>

      <Footer />
    </div>
  );
}

async function fetchExploreProducts({ cursor, city, state, category, signal }: { cursor: Cursor; city?: string; state?: string; category?: string; signal?: AbortSignal }): Promise<ProductPage> {
  let sellerQuery = supabase
    .from("sellers")
    .select("id, business_name, city, state, slug, whatsapp_number, category")
    .eq("verification_status", "approved")
    .eq("status", "active")
    .eq("is_blocked", false);

  if (city) sellerQuery = sellerQuery.eq("city", city);
  if (state) sellerQuery = sellerQuery.eq("state", state);
  if (category) sellerQuery = sellerQuery.eq("category", category);
  if (signal) sellerQuery = sellerQuery.abortSignal(signal);

  const { data: sellersData, error: sellersErr } = await sellerQuery.limit(750);
  if (sellersErr) throw sellersErr;
  const sellers = sellersData ?? [];
  if (sellers.length === 0) return { items: [], nextCursor: null, hasMore: false };

  const sellerMap = new Map<string, any>(sellers.map((seller: any) => [seller.id, seller]));
  let productQuery = supabase
    .from("products")
    .select("id, name, price, image_url, stock_status, seller_id, created_at")
    .eq("status", "active")
    .in("seller_id", [...sellerMap.keys()])
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    productQuery = productQuery.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`);
  }
  if (signal) productQuery = productQuery.abortSignal(signal);

  const { data: productData, error: productsErr } = await productQuery;
  if (productsErr) throw productsErr;

  const rows = productData ?? [];
  const pageItems = rows.slice(0, PAGE_SIZE).map((product: any) => ({
    ...product,
    sellers: sellerMap.get(product.seller_id) ?? null,
  }));
  const last = pageItems[pageItems.length - 1];
  return {
    items: shuffleArray(pageItems),
    hasMore: rows.length > PAGE_SIZE,
    nextCursor: rows.length > PAGE_SIZE && last?.created_at ? { created_at: last.created_at, id: last.id } : null,
  };
}

// Fisher-Yates — shuffles a page's items once, at fetch time. The cursor above
// is derived from `last` (the pre-shuffle order), so shuffling here is purely
// cosmetic and never affects pagination. Called once per page fetch, not on
// the concatenated feed, so already-visible products never jump position.
function shuffleArray<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dedupeProducts<T extends { id: string }>(products: T[]): T[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function ProductGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => <ProductSkeleton key={index} />)}
    </div>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-border-warm bg-card/70 px-6 py-14 text-center shadow-warm">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <PackageSearch className="h-8 w-8" />
      </div>
      <h2 className="font-display text-2xl text-espresso">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
      {action && <div className="mt-5">{action}</div>}
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
