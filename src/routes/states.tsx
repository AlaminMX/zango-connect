/**
 * /states — full searchable directory of active states.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { MapPin, Search } from "lucide-react";
import { assertLaunchGate } from "@/lib/launchGate";

export const Route = createFileRoute("/states")({
  beforeLoad: assertLaunchGate,
  head: () => ({
    meta: [
      { title: "All States — ZANGO" },
      { name: "description", content: "Browse every state on ZANGO. Find vendors and products in your region across northern Nigeria." },
      { property: "og:title", content: "All States — ZANGO" },
      { property: "og:description", content: "Browse every state on ZANGO." },
    ],
  }),
  component: StatesPage,
});

interface StateRow {
  id: string; name: string; slug: string; is_active: boolean;
  sellers_count: number; cities_count: number; products_count: number;
}

function StatesPage() {
  const [q, setQ] = useState("");

  const { data: states, isLoading } = useQuery({
    queryKey: ["all-states"],
    staleTime: 60_000,
    queryFn: async (): Promise<StateRow[]> => {
      const { data, error } = await (supabase as any)
        .from("states_with_stats")
        .select("*")
        .eq("is_active", true)
        .order("sellers_count", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const list = states ?? [];
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((s) => s.name.toLowerCase().includes(needle));
  }, [states, q]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <BackButton fallback="/" />
        <div className="mt-4">
          <h1 className="font-display text-3xl text-espresso">Explore states</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pick a state to see its cities, vendors and products.</p>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-warm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search states…"
            aria-label="Search states"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-3xl border bg-muted/40" />
              ))
            : filtered.length === 0
            ? (
              <div className="col-span-full py-14 text-center text-muted-foreground">
                No states match “{q}”.
              </div>
            )
            : filtered.map((s) => (
              <Link
                key={s.id}
                to="/state/$slug"
                params={{ slug: s.slug }}
                className="group flex flex-col justify-between rounded-3xl border border-border-warm bg-surface-warm/60 p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-surface-warm hover:shadow-warm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="mt-6">
                  <p className="font-display text-2xl text-espresso">{s.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.cities_count} {s.cities_count === 1 ? "city" : "cities"} · {s.sellers_count} vendors · {s.products_count} products
                  </p>
                </div>
              </Link>
            ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
