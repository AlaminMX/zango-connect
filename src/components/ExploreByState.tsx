/**
 * ExploreByState — groups cities by state on the homepage.
 * Each state tile shows seller + product counts and expands inline
 * to reveal its cities as sub-tiles linking to /city/$slug.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, ChevronDown, ChevronUp, ArrowUpRight, Building2 } from "lucide-react";

interface CityRow {
  id: string;
  name: string;
  state: string;
  slug: string;
  sellers_count: number;
  products_count: number;
}

interface StateGroup {
  state: string;
  sellers_count: number;
  products_count: number;
  city_count: number;
  cities: CityRow[];
}

export function ExploreByState() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: stateGroups, isLoading } = useQuery({
    queryKey: ["explore-by-state"],
    queryFn: async (): Promise<StateGroup[]> => {
      // Fetch cities with stats — group in JS for reliability across all Supabase plans
      const { data, error } = await (supabase as any)
        .from("cities_with_stats")
        .select("id, name, state, slug, is_active, sort_order, sellers_count, products_count")
        .eq("is_active", true)
        .order("sort_order");

      if (error || !data) {
        // Fallback to plain cities_of_business table
        const { data: fallback } = await supabase
          .from("cities_of_business")
          .select("id, name, state, slug")
          .eq("is_active", true)
          .order("sort_order");
        const cities = (fallback ?? []) as CityRow[];
        return groupByState(cities);
      }

      return groupByState(data as CityRow[]);
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <section className="mx-auto max-w-6xl px-5 py-12">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-deep">Regional hubs</p>
          <h2 className="mt-1 font-display text-3xl text-espresso">Explore by state</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-3xl border border-border-warm bg-surface-warm/60" />
          ))}
        </div>
      </section>
    );
  }

  if (!stateGroups || stateGroups.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-deep">Regional hubs</p>
          <h2 className="mt-1 font-display text-3xl text-espresso">Explore by state</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse sellers and products across northern Nigeria
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {stateGroups.map((sg) => {
          const isOpen = expanded === sg.state;
          return (
            <div key={sg.state} className="rounded-3xl border border-border-warm bg-surface-warm/40 overflow-hidden">
              {/* State header tile — clickable to expand */}
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : sg.state)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left transition hover:bg-surface-warm group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-display text-xl text-espresso">{sg.state}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sg.city_count} {sg.city_count === 1 ? "city" : "cities"}
                      {sg.sellers_count > 0 && (
                        <> · <span className="font-semibold text-espresso">{sg.sellers_count}</span> {sg.sellers_count === 1 ? "seller" : "sellers"}</>
                      )}
                      {sg.products_count > 0 && (
                        <> · <span className="font-semibold text-espresso">{sg.products_count}</span> products</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isOpen
                    ? <ChevronUp className="h-5 w-5 text-sage-deep" />
                    : <ChevronDown className="h-5 w-5 text-sage-deep group-hover:text-primary transition" />}
                </div>
              </button>

              {/* City sub-tiles — shown when expanded */}
              {isOpen && (
                <div className="px-5 pb-5">
                  <div className="h-px bg-border-warm mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sage-deep mb-3 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Cities in {sg.state}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {sg.cities.map((city) => (
                      <Link
                        key={city.id}
                        to="/city/$slug"
                        params={{ slug: city.slug }}
                        className="group flex flex-col justify-between rounded-2xl border border-border-warm bg-white p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-warm active:scale-95"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface-warm text-primary">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <ArrowUpRight className="h-3.5 w-3.5 text-sage-deep transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </div>
                        <div className="mt-4">
                          <p className="font-display text-base text-espresso">{city.name}</p>
                          {typeof city.sellers_count === "number" && city.sellers_count > 0 ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {city.sellers_count} {city.sellers_count === 1 ? "seller" : "sellers"}
                              {city.products_count > 0 && <> · {city.products_count} products</>}
                            </p>
                          ) : (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">Explore</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function groupByState(cities: CityRow[]): StateGroup[] {
  const map = new Map<string, StateGroup>();
  for (const city of cities) {
    if (!map.has(city.state)) {
      map.set(city.state, {
        state: city.state,
        sellers_count: 0,
        products_count: 0,
        city_count: 0,
        cities: [],
      });
    }
    const sg = map.get(city.state)!;
    sg.cities.push(city);
    sg.city_count++;
    sg.sellers_count += city.sellers_count ?? 0;
    sg.products_count += city.products_count ?? 0;
  }
  // Sort states by seller count descending
  return [...map.values()].sort((a, b) => b.sellers_count - a.sellers_count);
}
