import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { SellerCard } from "@/components/SellerCard";
import { ProductCard } from "@/components/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hausaFor, iconFor, NIGERIAN_CITIES } from "@/lib/categories";

export const Route = createFileRoute("/category/$slug")({ component: CategoryPage });

function CategoryPage() {
  const { slug } = Route.useParams();
  const [city, setCity] = useState("All cities");

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
        .eq("category", category!.name);
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
        .select("id, name, price, image_url, stock_status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number, category)")
        .eq("sellers.category", category!.name)
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
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Back</Link>
        <div className="mt-4 flex items-center gap-3">
          {(() => {
            const { icon: Icon, tint } = iconFor(category?.name);
            return (
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tint}`}>
                <Icon className="h-7 w-7" strokeWidth={2.2} />
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
              {NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Products first — discovery-led */}
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
