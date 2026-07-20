/**
 * ExploreCities — dynamic list of active cities of business.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ArrowUpRight } from "lucide-react";

interface CityRow {
  id: string; name: string; state: string; slug: string;
  sellers_count?: number; products_count?: number;
}

export function ExploreCities() {
  const { data: cities, isLoading } = useQuery({
    queryKey: ["explore-cities"],
    queryFn: async (): Promise<CityRow[]> => {
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
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-deep">Regional hubs</p>
          <h2 className="mt-1 font-display text-3xl text-espresso">Explore by city</h2>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cities.map((c) => (
          <Link
            key={c.id}
            to="/city/$slug"
            params={{ slug: c.slug }}
            className="group flex flex-col justify-between rounded-3xl border border-border-warm bg-surface-warm/60 p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-warm hover:shadow-warm"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-sage-deep transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sage-deep">{c.state}</p>
              <p className="mt-1 font-display text-2xl text-espresso">{c.name}</p>
              {typeof c.sellers_count === "number" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.sellers_count} {c.sellers_count === 1 ? "seller" : "sellers"} · {c.products_count ?? 0} products
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
