/**
 * ExploreCities — homepage section listing active cities of business.
 * Dynamically rendered from cities_of_business table (no hardcoded list).
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";

interface CityRow {
  id: string; name: string; state: string; slug: string;
  sellers_count?: number; products_count?: number;
}

export function ExploreCities() {
  const { data: cities, isLoading } = useQuery({
    queryKey: ["explore-cities"],
    queryFn: async (): Promise<CityRow[]> => {
      // Use the stats view (publicly readable via security_invoker; falls back to base table if RLS blocks).
      const { data, error } = await (supabase as any)
        .from("cities_with_stats")
        .select("id, name, state, slug, is_active, sort_order, sellers_count, products_count")
        .eq("is_active", true)
        .order("sort_order");
      if (error) {
        const { data: fallback } = await supabase.from("cities_of_business")
          .select("id, name, state, slug").eq("is_active", true).order("sort_order");
        return (fallback ?? []) as CityRow[];
      }
      return (data ?? []) as CityRow[];
    },
  });

  if (isLoading || !cities || cities.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="font-serif text-2xl">Explore by city</h2>
          <p className="text-xs text-muted-foreground">Zaɓi birni — shop your local marketplace</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cities.map((c) => (
          <Link
            key={c.id}
            to="/city/$slug"
            params={{ slug: c.slug }}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card p-4 shadow-warm transition hover:-translate-y-0.5 hover:shadow-warm-lg"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-secondary/60 to-rose/40">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <p className="font-serif text-base text-foreground">{c.name}</p>
            <p className="text-[11px] text-muted-foreground">{c.state}</p>
            {typeof c.sellers_count === "number" && (
              <p className="text-[11px] text-muted-foreground">
                {c.sellers_count} {c.sellers_count === 1 ? "seller" : "sellers"} · {c.products_count ?? 0} products
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
