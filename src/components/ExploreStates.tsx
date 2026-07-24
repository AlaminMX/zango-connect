/**
 * ExploreStates — top 5 featured/active states on the homepage
 * plus a "More states" tile linking to /states.
 */
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ArrowUpRight, ArrowRight } from "lucide-react";

interface StateRow {
  id: string; name: string; slug: string;
  is_featured_home?: boolean;
  sellers_count?: number; products_count?: number;
}

export function ExploreStates() {
  const { data: states, isLoading } = useQuery({
    queryKey: ["explore-states-home"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<StateRow[]> => {
      const { data, error } = await (supabase as any)
        .from("states_with_stats")
        .select("id, name, slug, is_active, is_featured_home, sort_order, sellers_count, products_count")
        .eq("is_active", true);
      if (error) return [];
      const rows = (data ?? []) as StateRow[];
      rows.sort((a, b) => {
        const af = a.is_featured_home ? 1 : 0;
        const bf = b.is_featured_home ? 1 : 0;
        if (af !== bf) return bf - af;
        const ac = a.sellers_count ?? 0;
        const bc = b.sellers_count ?? 0;
        if (ac !== bc) return bc - ac;
        return a.name.localeCompare(b.name);
      });
      return rows;
    },
  });

  if (isLoading || !states || states.length === 0) return null;

  const top5 = states.slice(0, 5);

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-deep">Regional hubs</p>
          <h2 className="mt-1 font-display text-3xl text-espresso">Explore by state</h2>
        </div>
        <Link
          to="/states"
          className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-sage-deep hover:text-primary sm:inline"
        >
          All states →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {top5.map((s) => (
          <Link
            key={s.id}
            to="/state/$slug"
            params={{ slug: s.slug }}
            className="group flex flex-col justify-between rounded-3xl border border-border-warm bg-surface-warm/60 p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-warm hover:shadow-warm"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-sage-deep transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <div className="mt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sage-deep">State</p>
              <p className="mt-1 font-display text-2xl text-espresso">{s.name}</p>
              {typeof s.sellers_count === "number" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {s.sellers_count} {s.sellers_count === 1 ? "vendor" : "vendors"} · {s.products_count ?? 0} products
                </p>
              )}
            </div>
          </Link>
        ))}
        <Link
          to="/states"
          className="group flex flex-col justify-between rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 p-5 transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary/10"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ArrowRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Discover</p>
            <p className="mt-1 font-display text-2xl text-espresso">More states</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Browse & search every state and city
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
