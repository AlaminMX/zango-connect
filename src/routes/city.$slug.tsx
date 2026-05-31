/**
 * /city/$slug — Dedicated city marketplace page (SEO-optimized).
 */
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { SellerCard } from "@/components/SellerCard";
import { Button } from "@/components/ui/button";
import { MapPin, Store, ArrowRight } from "lucide-react";
import { getCityMarketplace } from "@/lib/city-marketplace.functions";
import { iconFor } from "@/lib/categories";

const cityQuery = (slug: string) =>
  queryOptions({
    queryKey: ["city-marketplace", slug],
    queryFn: () => getCityMarketplace({ data: { slug } }),
  });

export const Route = createFileRoute("/city/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(cityQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "City not found — Sutura Market" }] };
    const { city } = loaderData;
    const title = `${city.name} Marketplace — Sutura Market`;
    const desc = `Discover sellers and products in ${city.name}, ${city.state}. Shop locally on Sutura — northern Nigeria's WhatsApp-first marketplace.`;
    const url = `/city/${city.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "/" },
              { "@type": "ListItem", position: 2, name: `${city.name} Marketplace`, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background"><TopBar /><div className="mx-auto max-w-3xl p-10 text-center">
      <h1 className="font-serif text-3xl">City not found</h1>
      <p className="mt-2 text-muted-foreground">This marketplace doesn't exist or is no longer available.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Back home</Link>
    </div></div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background"><TopBar /><div className="mx-auto max-w-3xl p-10 text-center">
      <h1 className="font-serif text-2xl">Couldn't load this marketplace</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div></div>
  ),
  component: CityPage,
});

function CityPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(cityQuery(slug));
  if (!data) return null;
  const { city, sellers, products, categories } = data;

  // Only categories that have at least one product in this city
  const activeCategoryNames = new Set(sellers.map((s: any) => s.category));
  const cityCategories = categories.filter((c: any) => activeCategoryNames.has(c.name));

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary/40 to-background py-12">
        <div className="mx-auto max-w-5xl px-5 text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium">
            <MapPin className="h-3 w-3 text-primary" /> {city.state} State
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl">{city.name} Marketplace</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Discover {sellers.length} {sellers.length === 1 ? "seller" : "sellers"} and {products.length} products
            available in {city.name}. Order on WhatsApp.
          </p>
        </div>
      </section>

      {/* Categories */}
      {cityCategories.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-8">
          <h2 className="mb-4 font-serif text-2xl">Browse by category</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {cityCategories.map((c: any) => {
              const { Component: Icon } = iconFor(c.name);
              return (
                <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }}
                  className="group flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/40">
                    <Icon size={40} />
                  </div>
                  <span className="text-center text-[11px] font-medium">{c.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Sellers */}
      <section className="mx-auto max-w-5xl px-5 py-6">
        <h2 className="mb-4 font-serif text-2xl">Sellers in {city.name}</h2>
        {sellers.length === 0 ? (
          <div className="rounded-2xl border bg-card p-8 text-center">
            <Store className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No approved sellers in {city.name} yet.</p>
            <Link to="/register"><Button className="mt-4 rounded-full">Be the first</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sellers.map((s: any) => <SellerCard key={s.id} {...s} />)}
          </div>
        )}
      </section>

      {/* Products */}
      {products.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-6">
          <h2 className="mb-4 font-serif text-2xl">Products in {city.name}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p: any) => (
              <ProductCard key={p.id} id={p.id} name={p.name} price={Number(p.price)}
                image_url={p.image_url} stock_status={p.stock_status}
                seller_id={p.sellers?.id}
                seller_name={p.sellers?.business_name} seller_city={city.name}
                seller_slug={p.sellers?.slug} whatsapp_number="" />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-5xl px-5 py-10 text-center">
        <Link to="/"><Button variant="ghost" className="rounded-full"><ArrowRight className="mr-1 h-4 w-4 rotate-180" /> Back to all cities</Button></Link>
      </section>

      <Footer />
    </div>
  );
}
