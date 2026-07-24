/**
 * /state/$slug — Lists all active cities under a state with vendor + product counts.
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { assertLaunchGate } from "@/lib/launchGate";

interface CityStat {
  id: string; name: string; slug: string; is_active: boolean;
  sellers_count: number; products_count: number;
}
interface StateData {
  state: { id: string; name: string; slug: string; sellers_count: number; products_count: number; cities_count: number };
  cities: CityStat[];
}

const stateQuery = (slug: string) =>
  queryOptions({
    queryKey: ["state-page", slug],
    queryFn: async (): Promise<StateData | null> => {
      const { data: st, error: stErr } = await (supabase as any)
        .from("states_with_stats")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (stErr) throw stErr;
      if (!st) return null;
      const { data: cities, error: cErr } = await (supabase as any)
        .from("cities_with_stats")
        .select("id, name, slug, is_active, sellers_count, products_count")
        .eq("state_id", st.id)
        .eq("is_active", true)
        .order("sellers_count", { ascending: false })
        .order("name");
      if (cErr) throw cErr;
      return { state: st, cities: (cities ?? []) as CityStat[] };
    },
  });

export const Route = createFileRoute("/state/$slug")({
  beforeLoad: assertLaunchGate,
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(stateQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "State not found — ZANGO" }, { name: "robots", content: "noindex" }] };
    const { state } = loaderData;
    const title = `${state.name} — Vendors & products on ZANGO`;
    const desc = `Explore ${state.sellers_count} vendors and ${state.products_count} products across ${state.cities_count} ${state.cities_count === 1 ? "city" : "cities"} in ${state.name}.`;
    const url = `/state/${state.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background"><TopBar /><div className="mx-auto max-w-3xl p-10 text-center">
      <h1 className="font-serif text-3xl">State not found</h1>
      <Link to="/states" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Browse states</Link>
    </div></div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background"><TopBar /><div className="mx-auto max-w-3xl p-10 text-center">
      <h1 className="font-serif text-2xl">Couldn't load this state</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div></div>
  ),
  component: StatePage,
});

function StatePage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(stateQuery(slug));
  if (!data) return null;
  const { state, cities } = data;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <BackButton fallback="/states" />
        <section className="mt-4 rounded-3xl border border-border-warm bg-surface-warm/60 p-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-deep">State</p>
          <h1 className="mt-1 font-display text-4xl text-espresso">{state.name}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {state.cities_count} {state.cities_count === 1 ? "city" : "cities"} · {state.sellers_count} vendors · {state.products_count} products
          </p>
        </section>

        <h2 className="mt-8 font-display text-2xl text-espresso">Cities in {state.name}</h2>
        {cities.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No cities in {state.name} are visible yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cities.map((c) => (
              <Link
                key={c.id}
                to="/city/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col justify-between rounded-3xl border border-border-warm bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-warm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/40 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="mt-6">
                  <p className="font-display text-xl text-espresso">{c.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.sellers_count} vendors · {c.products_count} products
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
