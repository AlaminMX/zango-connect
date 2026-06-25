import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { SellerCard } from "@/components/SellerCard";
import { ProductCard } from "@/components/ProductCard";
import { BackButton } from "@/components/BackButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hausaFor, iconFor } from "@/lib/categories";
import { useCity } from "@/lib/cityContext";

function prettifySlug(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
  head: ({ params }) => {
    const name = prettifySlug(params.slug);
    const url = `https://sutura-connect.lovable.app/category/${params.slug}`;
    const title = `${name} — Sutura Market`;
    const description = `Browse ${name} sellers and products across northern Nigeria. Order on WhatsApp.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${name} on Sutura Market`,
          url,
          description,
        }),
      }],
    };
  },
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { selectedCity: globalCity, activeCities } = useCity();
  const [city, setCity] = useState(globalCity !== "All" ? globalCity : "All cities");

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["sellers", category?.name, city],
    enabled: !!category,
    queryFn: async () => {
      let q = supabase
        .from("sellers")
        .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
        .eq("category", category!.name)
        .eq("is_blocked", false)
        .eq("verification_status", "approved");
      if (city !== "All cities") q = q.eq("city", city);
      const { data, error } = await q.order("is_verified", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["cat-products", category?.name, city],
    enabled: !!category,
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("id, name, price, image_url, stock_status, status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number, category, is_blocked, verification_status)")
        .eq("sellers.category", category!.name)
        .eq("status", "active")
        .eq("sellers.is_blocked", false)
        .eq("sellers.verification_status", "approved")
        .order("created_at", { ascending: false })
        .limit(24);
      if (city !== "All cities") qb = qb.eq("sellers.city", city);
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  const hausa = hausaFor(category?.name);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <BackButton fallback="/" />

        {/* Category header — image if available, icon fallback */}
        <div className="mt-5 flex items-center gap-3">
          {(() => {
            const { Component: IconComponent, containerClass } = iconFor(category?.name);
            const imageUrl = (category as any)?.image_url;
            return (
              <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl ${imageUrl ? "" : containerClass}`}>
                {imageUrl ? (
                  <img src={imageUrl} alt={category?.name} className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  <IconComponent size={42} />
                )}
              </div>
            );
          })()}
          <div>
            <h1 className="font-serif text-3xl leading-tight">{category?.name ?? "Category"}</h1>
            {hausa && <p className="text-sm italic text-muted-foreground">{hausa}</p>}
          </div>
        </div>

        <div className="mt-6">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-44 rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All cities">All cities</SelectItem>
              {activeCities.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {products && products.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-serif text-xl">Products</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => {
                const s = (p as any).sellers;
                return (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    price={Number(p.price)}
                    image_url={p.image_url}
                    stock_status={p.stock_status}
                    status={(p as any).status}
                    seller_id={p.seller_id}
                    seller_name={s?.business_name}
                    seller_city={s?.city}
                    seller_slug={s?.slug}
                    whatsapp_number={s?.whatsapp_number ?? ""}
                  />
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="mb-3 font-serif text-xl">Sellers</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {sellers?.map((s) => <SellerCard key={s.id} {...s} />)}
            {sellers && sellers.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No sellers in this category yet.
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
