/**
 * products.tsx — /products
 * Full product catalog with category + city filtering and load-more pagination.
 * Blocked products and products from blocked sellers are excluded.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePostgrestLike } from "@/lib/postgrestSafe";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { BackButton } from "@/components/BackButton";
import { ProductSkeleton } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useCity } from "@/lib/cityContext";
import { z } from "zod";

const PAGE_SIZE = 16;

const schema = z.object({
  category: z.string().optional().catch(undefined),
  city:     z.string().optional().catch(undefined),
});

import { assertLaunchGate } from "@/lib/launchGate";
export const Route = createFileRoute("/products")({
  beforeLoad: assertLaunchGate,
  validateSearch: (s) => schema.parse(s),
  component: ProductsPage,
});

function ProductsPage() {
  const { category: initCat, city: initCity } = Route.useSearch();
  const nav = useNavigate();
  const { selectedCity: globalCity, activeCities } = useCity();

  const [filterCat,  setFilterCat]  = useState(initCat  ?? "All");
  // Use URL city param first, then global context city, then "All"
  const [filterCity, setFilterCity] = useState(initCity ?? (globalCity !== "All" ? globalCity : "All"));
  const [q, setQ]                   = useState("");
  const [page, setPage]             = useState(1);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name").order("sort_order");
      return data ?? [];
    },
  });

  const activeCat  = filterCat  !== "All" ? filterCat  : undefined;
  const activeCity = filterCity !== "All" ? filterCity : undefined;

  const { data: products, isLoading } = useQuery({
    queryKey: ["all-products", activeCat, activeCity, q, page],
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("id, name, price, image_url, stock_status, status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number, category, is_blocked, verification_status)")
        .eq("status", "active")
        .eq("sellers.is_blocked", false)
        .eq("sellers.verification_status", "approved")
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (activeCat)  qb = qb.eq("sellers.category", activeCat);
      if (activeCity) qb = qb.eq("sellers.city", activeCity);
      if (q.trim())   qb = qb.or(`name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);

      const { data, error } = await qb.abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      return data ?? [];
    },
  });

  const applyFilter = (type: "cat" | "city", val: string) => {
    setPage(1);
    if (type === "cat")  setFilterCat(val);
    if (type === "city") setFilterCity(val);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) nav({ to: "/search", search: { q: q.trim() } });
  };

  const hasMore = (products?.length ?? 0) === PAGE_SIZE;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <BackButton fallback="/" />
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl">All Products</h1>
            <p className="text-xs text-muted-foreground mt-1">Duk kayan sayarwa</p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="mt-5 flex flex-wrap gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 min-w-[180px] items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-warm">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </form>

          <Select value={filterCat} onValueChange={(v) => applyFilter("cat", v)}>
            <SelectTrigger className="w-[160px] rounded-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterCity} onValueChange={(v) => applyFilter("city", v)}>
            <SelectTrigger className="w-[140px] rounded-full">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All cities</SelectItem>
              {activeCities.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: PAGE_SIZE }).map((_, i) => <ProductSkeleton key={i} />)
            : products && products.length > 0
            ? products.map((p, i) => {
                const s = (p as any).sellers;
                return (
                  <div key={p.id} className="card-enter" style={{ animationDelay: `${i * 0.03}s` }}>
                    <ProductCard
                      id={p.id} name={p.name} price={Number(p.price)}
                      image_url={p.image_url} stock_status={p.stock_status}
                      status={(p as any).status}
                      seller_id={p.seller_id}
                      seller_name={s?.business_name} seller_city={s?.city}
                      seller_slug={s?.slug} whatsapp_number={s?.whatsapp_number ?? ""}
                    />
                  </div>
                );
              })
            : (
              <div className="col-span-full py-16 text-center">
                <p className="font-serif text-xl text-muted-foreground">No products found</p>
                <p className="mt-2 text-sm text-muted-foreground">Try clearing your filters.</p>
              </div>
            )}
        </div>

        {/* Pagination */}
        <div className="mt-8 flex items-center justify-center gap-3">
          {page > 1 && (
            <Button variant="outline" className="rounded-full" onClick={() => setPage((p) => p - 1)}>
              ← Previous
            </Button>
          )}
          {hasMore && (
            <Button variant="outline" className="rounded-full" onClick={() => setPage((p) => p + 1)}>
              Load more →
            </Button>
          )}
        </div>
      </div>
      <Footer />

      <style>{`
        @keyframes card-enter {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-enter { animation: card-enter 0.35s ease both; }
      `}</style>
    </div>
  );
}
