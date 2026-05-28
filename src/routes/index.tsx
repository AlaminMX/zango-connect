import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { SellerCard } from "@/components/SellerCard";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Search, MapPin } from "lucide-react";
import { hausaFor, NIGERIAN_CITIES } from "@/lib/categories";

export const Route = createFileRoute("/")({ component: Index });

const PLACEHOLDER_SELLERS = [
  { business_name: "Zainab's Kitchen", category: "Food & Drinks", city: "Kano", initial: "Z" },
  { business_name: "Khadija Fabrics", category: "Fashion", city: "Kaduna", initial: "K" },
  { business_name: "Fati Glow Beauty", category: "Beauty", city: "Abuja", initial: "F" },
];

const PLACEHOLDER_PRODUCTS = [
  { name: "Suya Plate", price: 2500, seller: "Zainab's Kitchen", city: "Kano", emoji: "🍢" },
  { name: "Ankara Gele", price: 4500, seller: "Khadija Fabrics", city: "Kaduna", emoji: "👗" },
  { name: "Shea Body Butter", price: 3000, seller: "Fati Glow Beauty", city: "Abuja", emoji: "🌸" },
  { name: "Zobo Drink (1L)", price: 1200, seller: "Zainab's Kitchen", city: "Kano", emoji: "🥤" },
  { name: "Atampa Wrapper", price: 6000, seller: "Khadija Fabrics", city: "Kaduna", emoji: "🧵" },
  { name: "Black Soap", price: 1500, seller: "Fati Glow Beauty", city: "Abuja", emoji: "🧼" },
];

function Index() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("All cities");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["featured-sellers", city],
    queryFn: async () => {
      let qb = supabase
        .from("sellers")
        .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);
      if (city !== "All cities") qb = qb.eq("city", city);
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  const { data: featuredProducts } = useQuery({
    queryKey: ["featured-products", city],
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("id, name, price, image_url, stock_status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number)")
        .order("created_at", { ascending: false })
        .limit(8);
      if (city !== "All cities") qb = qb.eq("sellers.city", city);
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  const hasRealSellers = (featured?.length ?? 0) > 0;
  const hasRealProducts = (featuredProducts?.length ?? 0) > 0;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav({ to: "/search", search: { q: q.trim(), city: city !== "All cities" ? city : undefined } });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-warm opacity-60" />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: -5 }}>
          <div className="absolute -left-10 top-6 h-72 w-72 rounded-full bg-primary blur-3xl animate-float" style={{ opacity: 0.15 }} />
          <div className="absolute -bottom-20 -right-10 h-96 w-96 rounded-full bg-secondary blur-3xl animate-float"
            style={{ opacity: 0.2, animationDuration: "16s", animationDirection: "reverse", animationDelay: "2s" }} />
          <div className="absolute right-8 top-4 h-56 w-56 rounded-full bg-accent blur-3xl animate-float"
            style={{ opacity: 0.1, animationDuration: "20s", animationDelay: "4s" }} />
        </div>

        <div className="mx-auto max-w-3xl px-5 pt-10 pb-10 text-center sm:pt-16 sm:pb-14">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="h-3 w-3" /> Kasuwa · Community marketplace
          </div>
          <h1 className="font-serif text-4xl font-medium leading-[1.05] text-foreground sm:text-6xl">
            Kasuwa —<br />
            <span className="italic text-primary">Shop from Northern Nigeria's Best.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-muted-foreground">
            Discover trusted local sellers, handmade products, fashion, food, and everyday essentials.
          </p>

          {/* Search + city filter */}
          <form onSubmit={submitSearch} className="mx-auto mt-7 flex max-w-xl flex-col gap-2 rounded-3xl border border-border bg-card/90 p-2 shadow-warm-lg backdrop-blur sm:flex-row sm:rounded-full">
            <div className="flex flex-1 items-center gap-2 rounded-full bg-background px-4 py-2.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tuwo, ankara, zobo, shoes…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-11 w-full rounded-full border-0 bg-background text-sm sm:w-36">
                <MapPin className="mr-1 h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All cities">All cities</SelectItem>
                {NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
              Search
            </Button>
          </form>

          <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link to="/register" className="text-sm text-primary underline">
              Fara Kasuwanci — List Your Business
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-5xl px-5 py-10 scroll-mt-20">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl">Browse by category</h2>
            <p className="text-xs text-muted-foreground">Zaɓi kasuwa</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="shimmer group rounded-2xl border border-border/60 bg-card p-4 shadow-warm transition hover:-translate-y-0.5 hover:shadow-warm-lg"
            >
              <div className="relative z-[2] text-3xl">{c.icon_emoji}</div>
              <div className="relative z-[2] mt-3 font-serif text-base leading-tight">{c.name}</div>
              {hausaFor(c.name) && (
                <div className="relative z-[2] text-xs italic text-muted-foreground">{hausaFor(c.name)}</div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* New sellers row */}
      <section className="mx-auto max-w-5xl px-5 py-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl">New sellers</h2>
            <p className="text-xs text-muted-foreground">Sababbin masu sayarwa</p>
          </div>
        </div>
        <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {hasRealSellers
            ? featured!.map((s, i) => (
                <div key={s.id} className="card-enter w-72 shrink-0" style={{ animationDelay: `${i * 0.08}s` }}>
                  <SellerCard {...s} />
                </div>
              ))
            : PLACEHOLDER_SELLERS.map((s, i) => (
                <div
                  key={s.business_name}
                  className="card-enter w-64 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-warm"
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-xl text-primary">
                      {s.initial}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base font-semibold">{s.business_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.category} · {s.city}</p>
                      <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                        Coming soon
                      </span>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* Featured products — central to discovery */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl">Featured products</h2>
            <p className="text-xs text-muted-foreground">Kayan da aka fi so</p>
          </div>
        </div>

        {hasRealProducts ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts!.map((p, i) => {
              const s = (p as any).sellers;
              return (
                <div key={p.id} className="card-enter" style={{ animationDelay: `${i * 0.05}s` }}>
                  <ProductCard
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {PLACEHOLDER_PRODUCTS.map((p, i) => (
              <div
                key={p.name}
                className="card-enter overflow-hidden rounded-2xl border border-border/60 bg-card shadow-warm"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-secondary/60 to-rose/60 text-6xl">
                  {p.emoji}
                </div>
                <div className="p-3">
                  <h4 className="line-clamp-1 font-medium">{p.name}</h4>
                  <p className="mt-0.5 font-serif text-lg text-primary">₦{p.price.toLocaleString()}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.seller} · {p.city}</p>
                  <div className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                    Coming soon
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!hasRealProducts && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/register" className="font-medium text-primary underline">Be the first to list real products.</Link>
          </p>
        )}
      </section>

      <Footer />
    </div>
  );
}
