import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { SellerCard } from "@/components/SellerCard";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  city: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(schema),
  component: SearchPage,
});

function SearchPage() {
  const { q, city } = Route.useSearch();

  const { data: products } = useQuery({
    queryKey: ["search-products", q, city],
    enabled: !!q,
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("id, name, price, image_url, stock_status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number)")
        .ilike("name", `%${q}%`)
        .limit(40);
      if (city) qb = qb.eq("sellers.city", city);
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  const { data: sellers } = useQuery({
    queryKey: ["search-sellers", q, city],
    enabled: !!q,
    queryFn: async () => {
      let qb = supabase
        .from("sellers")
        .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
        .or(`business_name.ilike.%${q}%,category.ilike.%${q}%`)
        .limit(20);
      if (city) qb = qb.eq("city", city);
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Back</Link>
        <h1 className="mt-3 font-serif text-3xl">
          Results for <span className="italic text-primary">"{q}"</span>
          {city && <span className="text-base font-normal text-muted-foreground"> in {city}</span>}
        </h1>

        <section className="mt-8">
          <h2 className="mb-3 font-serif text-xl">Products ({products?.length ?? 0})</h2>
          {products && products.length > 0 ? (
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
                    seller_id={p.seller_id}
                    seller_name={s?.business_name}
                    seller_city={s?.city}
                    seller_slug={s?.slug}
                    whatsapp_number={s?.whatsapp_number ?? ""}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No products match.</p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-3 font-serif text-xl">Sellers ({sellers?.length ?? 0})</h2>
          {sellers && sellers.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {sellers.map((s) => <SellerCard key={s.id} {...s} />)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sellers match.</p>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
