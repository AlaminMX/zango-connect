/**
 * /cities — full directory of every active city, grouped by state,
 * with a live client-side search over city and state names.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { MapPin, Search, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/cities")({
  head: () => ({
    meta: [
      { title: "All cities — ZANGO" },
      { name: "description", content: "Browse every city and state on ZANGO. Search for sellers by city or state across northern Nigeria." },
      { property: "og:title", content: "All cities — ZANGO" },
      { property: "og:description", content: "Browse every city and state on ZANGO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://sutura-connect.lovable.app/cities" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "All cities on ZANGO",
          url: "https://sutura-connect.lovable.app/cities",
        }),
      },
    ],
  }),
  component: CitiesPage,
});

interface CityRow {
  id: string; name: string; state: string; slug: string;
  sellers_count: number; products_count: number;
}

function CitiesPage() {
  const [q, setQ] = useState("");

  const { data: cities = [], isLoading } = useQuery({
    queryKey: ["all-cities"],
    staleTime: 60_000,
    queryFn: async (): Promise<CityRow[]> => {
      const { data, error } = await (supabase as any)
        .from("cities_with_stats")
        .select("id, name, state, slug, is_active, sellers_count, products_count")
        .eq("is_active", true);
      if (error) {
        const { data: fb } = await supabase
          .from("cities_of_business")
          .select("id, name, state, slug")
          .eq("is_active", true);
        return ((fb ?? []) as any[]).map((c) => ({ ...c, sellers_count: 0, products_count: 0 }));
      }
      return (data ?? []) as CityRow[];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cities;
    return cities.filter(
      (c) => c.name.toLowerCase().includes(needle) || c.state.toLowerCase().includes(needle),
    );
  }, [cities, q]);

  const byState = useMemo(() => {
    const map = new Map<string, CityRow[]>();
    for (const c of filtered) {
      if (!map.has(c.state)) map.set(c.state, []);
      map.get(c.state)!.push(c);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (b.sellers_count ?? 0) - (a.sellers_count ?? 0) || a.name.localeCompare(b.name));
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-8">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-deep">Directory</p>
          <h1 className="mt-1 font-display text-4xl text-espresso">All cities on ZANGO</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {cities.length} {cities.length === 1 ? "city" : "cities"} across northern Nigeria. Search by city or state.
          </p>
        </div>

        <div className="relative mb-8 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search city or state (e.g. Kano, Kaduna, Sokoto)"
            aria-label="Search cities or states"
            className="w-full rounded-full border border-border-warm bg-white py-3 pl-11 pr-4 text-sm shadow-warm outline-none focus:border-primary/60"
          />
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Loading cities…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-3xl border border-border-warm bg-surface-warm/60 p-10 text-center">
            <p className="font-display text-2xl text-espresso">No matches</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different city or state name.
            </p>
          </div>
        )}

        <div className="space-y-10">
          {byState.map(([state, list]) => (
            <section key={state}>
              <h2 className="mb-4 flex items-baseline gap-2 font-display text-2xl text-espresso">
                {state}
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-deep">
                  {list.length} {list.length === 1 ? "city" : "cities"}
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((c) => (
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
                      <p className="font-display text-xl text-espresso">{c.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.sellers_count ?? 0} {(c.sellers_count ?? 0) === 1 ? "seller" : "sellers"}
                        {" · "}
                        {c.products_count ?? 0} products
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
