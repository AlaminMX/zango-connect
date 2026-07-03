/**
 * search.tsx
 * Fully upgraded search — supports:
 *   • Seller name, business name, bio
 *   • Product name, description
 *   • Category / city filtering
 *   • Blocked sellers and blocked products excluded from results
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { SellerCard } from "@/components/SellerCard";
import { BackButton } from "@/components/BackButton";
import { ProductSkeleton, SellerSkeleton } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import { useCity } from "@/lib/cityContext";
import { z } from "zod";

const schema = z.object({
  q:        z.string().catch("").default(""),
  city:     z.string().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/search")({
  validateSearch: (search) => schema.parse(search),
  component: SearchPage,
});

function SearchPage() {
  const { q, city: initialCity, category: initialCategory } = Route.useSearch();
  const nav = useNavigate();

  const [localQ, setLocalQ]         = useState(q);
  const [debouncedQ, setDebouncedQ] = useState(q);
  const { activeCities } = useCity();
  const [filterCity, setFilterCity] = useState(initialCity ?? "All cities");
  const [filterCat, setFilterCat]   = useState(initialCategory ?? "All categories");
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(localQ);
    }, 500);
    return () => clearTimeout(timer);
  }, [localQ]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name").order("sort_order");
      return data ?? [];
    },
  });

  const activeCity = filterCity !== "All cities" ? filterCity : undefined;
  const activeCat  = filterCat  !== "All categories" ? filterCat : undefined;

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["search-products", debouncedQ, activeCity, activeCat],
    enabled: !!debouncedQ,
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("id, name, price, image_url, stock_status, status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number, category, is_blocked, verification_status)")
        .or(`name.ilike.%${debouncedQ}%,description.ilike.%${debouncedQ}%`)
        .eq("status", "active")
        .eq("sellers.is_blocked", false)
        .eq("sellers.verification_status", "approved")
        .limit(40);
      if (activeCity) qb = qb.eq("sellers.city", activeCity);
      if (activeCat)  qb = qb.eq("sellers.category", activeCat);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sellers, isLoading: sellersLoading } = useQuery({
    queryKey: ["search-sellers", debouncedQ, activeCity, activeCat],
    enabled: !!debouncedQ,
    queryFn: async () => {
      let qb = supabase
        .from("sellers")
        .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
        .or(`business_name.ilike.%${debouncedQ}%,name.ilike.%${debouncedQ}%,bio.ilike.%${debouncedQ}%,category.ilike.%${debouncedQ}%,city.ilike.%${debouncedQ}%`)
        .eq("is_blocked", false)
        .eq("verification_status", "approved")
        .limit(20);
      if (activeCity) qb = qb.eq("city", activeCity);
      if (activeCat)  qb = qb.eq("category", activeCat);
      const { data, error } = await qb;
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localQ.trim()) return;
    nav({ to: "/search", search: {
      q: localQ.trim(),
      city:     filterCity !== "All cities"     ? filterCity : undefined,
      category: filterCat  !== "All categories" ? filterCat  : undefined,
    }});
  };

  const totalResults = (products?.length ?? 0) + (sellers?.length ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <BackButton fallback="/" />

        {/* Search bar */}
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-warm">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Search products, sellers, categories, cities…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Button type="button" variant="outline" size="icon" className="rounded-full"
            onClick={() => setShowFilters((v) => !v)} aria-label="Filters">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button type="submit" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-5">
            Search
          </Button>
        </form>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-3 rounded-2xl border bg-card p-4 shadow-warm">
            <div className="flex-1 min-w-[140px]">
              <p className="mb-1 text-xs font-medium text-muted-foreground">City / State</p>
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All cities">All cities</SelectItem>
                  {activeCities.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Category</p>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All categories">All categories</SelectItem>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Results heading */}
        {q && (
          <h1 className="mt-6 font-serif text-2xl">
            Results for <span className="italic text-primary">"{q}"</span>
            {(activeCity || activeCat) && (
              <span className="text-base font-normal text-muted-foreground">
                {activeCity ? ` in ${activeCity}` : ""}{activeCat ? ` · ${activeCat}` : ""}
              </span>
            )}
          </h1>
        )}

        {q && !productsLoading && !sellersLoading && totalResults === 0 && (
          <div className="mt-10 text-center">
            <p className="font-serif text-xl text-muted-foreground">No results found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different keyword, or{" "}
              <button onClick={() => { setFilterCity("All cities"); setFilterCat("All categories"); }}
                className="text-primary underline">clear filters</button>.
            </p>
          </div>
        )}

        {/* Products */}
        {q && (
          <section className="mt-8">
            <h2 className="mb-3 font-serif text-xl">
              Products
              {!productsLoading && <span className="ml-2 text-sm font-normal text-muted-foreground">({products?.length ?? 0})</span>}
            </h2>
            {productsLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : products && products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => {
                  const s = (p as any).sellers;
                  return (
                    <ProductCard key={p.id} id={p.id} name={p.name} price={Number(p.price)}
                      image_url={p.image_url} stock_status={p.stock_status}
                      status={(p as any).status}
                      seller_id={p.seller_id}
                      seller_name={s?.business_name} seller_city={s?.city}
                      seller_slug={s?.slug} whatsapp_number={s?.whatsapp_number ?? ""} />
                  );
                })}
              </div>
            ) : q ? (
              <p className="text-sm text-muted-foreground">No products match.</p>
            ) : null}
          </section>
        )}

        {/* Sellers */}
        {q && (
          <section className="mt-10">
            <h2 className="mb-3 font-serif text-xl">
              Sellers
              {!sellersLoading && <span className="ml-2 text-sm font-normal text-muted-foreground">({sellers?.length ?? 0})</span>}
            </h2>
            {sellersLoading ? (
              <div className="flex flex-wrap gap-3">
                {Array.from({ length: 3 }).map((_, i) => <SellerSkeleton key={i} />)}
              </div>
            ) : sellers && sellers.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {sellers.map((s) => <SellerCard key={s.id} {...s} />)}
              </div>
            ) : q ? (
              <p className="text-sm text-muted-foreground">No sellers match.</p>
            ) : null}
          </section>
        )}

        {!q && (
          <div className="mt-16 text-center">
            <p className="font-serif text-xl text-muted-foreground">Start typing to search</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Search by seller name, product name, category, city, or keywords.
            </p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
