import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { SellerCard } from "@/components/SellerCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users } from "lucide-react";
import { NIGERIAN_CITIES } from "@/lib/categories";
import { BackButton } from "@/components/BackButton";
import { useCityFilter, ALL_CITIES } from "@/lib/cityFilter";

export const Route = createFileRoute("/sellers")({ component: SellersPage });

function SellersPage() {
  const [search, setSearch] = useState("");
  // Pick up the city pre-selected in TopBar
  const { city, setCity } = useCityFilter();
  const [category, setCategory] = useState("All categories");

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["all-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
        .eq("is_blocked", false)
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categoryOptions } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("name").order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!sellers) return [];
    return sellers.filter((s) => {
      const matchSearch =
        !search.trim() ||
        s.business_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.city ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.category ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCity = city === "All cities" || s.city === city;
      const matchCat = category === "All categories" || s.category === category;
      return matchSearch && matchCity && matchCat;
    });
  }, [sellers, search, city, category]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex items-center gap-3 mb-6">
          <BackButton fallback="/" />
          <div className="flex-1">
            <h1 className="font-serif text-3xl">All Sellers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dukkan masu sayarwa — browse every store on Sutura Market
            </p>
          </div>
          {!isLoading && (
            <span className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "seller" : "sellers"}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, city, or category…"
              aria-label="Search sellers"
              className="pl-9 rounded-full"
            />
          </div>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-full rounded-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All cities">All cities</SelectItem>
              {NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full rounded-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All categories">All categories</SelectItem>
              {(categoryOptions ?? []).map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-card p-4 shadow-warm">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-14 w-14 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s, i) => (
              <div key={s.id} className="card-enter" style={{ animationDelay: `${i * 0.04}s` }}>
                <SellerCard {...s} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-serif text-xl text-muted-foreground">No sellers found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters or{" "}
              <button
                onClick={() => { setSearch(""); setCity("All cities"); setCategory("All categories"); }}
                className="text-primary underline underline-offset-2"
              >
                clear all
              </button>
            </p>
            <Link to="/register" className="mt-5 text-sm font-medium text-primary underline underline-offset-2">
              Be the first to open a store →
            </Link>
          </div>
        )}
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
