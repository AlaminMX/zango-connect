/**
 * index.tsx
 * Homepage — fully dynamic:
 *  • Section text driven by homepage_sections table (admin-managed)
 *  • Featured products (admin-controlled via is_featured flag)
 *  • Category cards now show uploaded image if available (falls back to icon)
 *  • Blocked sellers/products automatically excluded via RLS
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { SellerCard } from "@/components/SellerCard";
import { ProductCard } from "@/components/ProductCard";
import { ProductSkeleton, CategorySkeleton, SellerSkeleton } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Search, MapPin, Store, ArrowRight, Heart } from "lucide-react";
import { iconFor, NIGERIAN_CITIES } from "@/lib/categories";
import { ExploreCities } from "@/components/ExploreCities";
import heroImg from "@/assets/hero-market.jpg";

export const Route = createFileRoute("/")({ component: Index });

const PLACEHOLDER_SELLERS = [
  { business_name: "Zainab's Kitchen", category: "Food & Drinks", city: "Kano", initial: "Z" },
  { business_name: "Khadija Fabrics",  category: "Fashion",       city: "Kaduna", initial: "K" },
  { business_name: "Fati Glow Beauty", category: "Beauty",        city: "Abuja", initial: "F" },
];

const PLACEHOLDER_PRODUCTS = [
  { name: "Suya Plate",       price: 2500, seller: "Zainab's Kitchen", city: "Kano",   emoji: "🍢" },
  { name: "Ankara Gele",      price: 4500, seller: "Khadija Fabrics",  city: "Kaduna", emoji: "👗" },
  { name: "Shea Body Butter", price: 3000, seller: "Fati Glow Beauty", city: "Abuja",  emoji: "🌸" },
  { name: "Zobo Drink (1L)",  price: 1200, seller: "Zainab's Kitchen", city: "Kano",   emoji: "🥤" },
  { name: "Atampa Wrapper",   price: 6000, seller: "Khadija Fabrics",  city: "Kaduna", emoji: "🧵" },
  { name: "Black Soap",       price: 1500, seller: "Fati Glow Beauty", city: "Abuja",  emoji: "🧼" },
];

function useSection(sections: any[] | undefined, key: string) {
  return sections?.find((s: any) => s.key === key && s.is_visible !== false);
}

function Index() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [city, setCity] = useState<string>("All cities");
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { if (alive) setWishlistCount(0); return; }
      const { count } = await supabase.from("wishlists").select("product_id", { count: "exact", head: true }).eq("user_id", u.user.id);
      if (alive) setWishlistCount(count ?? 0);
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  const { data: sections } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data } = await supabase.from("homepage_sections").select("*").eq("is_visible", true).order("sort_order");
      return data ?? [];
    },
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: featured, isLoading: sellersLoading } = useQuery({
    queryKey: ["featured-sellers", city],
    queryFn: async () => {
      let qb = supabase
        .from("sellers")
        .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
        .eq("is_blocked", false)
        .order("is_verified", { ascending: false })
        .order("created_at",  { ascending: false })
        .limit(10);
      if (city !== "All cities") qb = qb.eq("city", city);
      const { data, error } = await qb;
      if (error) throw error;
      return data;
    },
  });

  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ["featured-products", city],
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("id, name, price, image_url, stock_status, is_featured, featured_order, status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number, is_blocked)")
        .eq("is_featured", true)
        .eq("status", "active")
        .eq("sellers.is_blocked", false)
        .order("featured_order")
        .limit(8);
      if (city !== "All cities") qb = qb.eq("sellers.city", city);
      const { data: featData } = await qb;

      if (featData && featData.length > 0) return featData;

      let qb2 = supabase
        .from("products")
        .select("id, name, price, image_url, stock_status, status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number, is_blocked)")
        .eq("status", "active")
        .eq("sellers.is_blocked", false)
        .order("created_at", { ascending: false })
        .limit(8);
      if (city !== "All cities") qb2 = qb2.eq("sellers.city", city);
      const { data, error } = await qb2;
      if (error) throw error;
      return data;
    },
  });

  const hasRealSellers  = (featured?.length ?? 0) > 0;
  const hasRealProducts = (featuredProducts?.length ?? 0) > 0;

  const heroSection       = useSection(sections, "hero");
  const newSellersSection = useSection(sections, "new_sellers");
  const featuredSection   = useSection(sections, "featured_products");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav({ to: "/search", search: { q: q.trim(), city: city !== "All cities" ? city : undefined } });
  };

  const keyframes = `
    @keyframes sutura-bounce {
      0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
      40%            { transform: translateY(-8px); opacity: 1;   }
    }
    @keyframes card-enter {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0);    }
    }
    .card-enter { animation: card-enter 0.35s ease both; }
  `;

  return (
    <div className="min-h-screen bg-background">
      <style>{keyframes}</style>
      <TopBar />

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={heroImg} alt="Northern Nigerian market scene" className="h-full w-full object-cover object-center" loading="eager" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: -5 }}>
          <div className="absolute -left-10 top-6 h-72 w-72 rounded-full bg-primary blur-3xl animate-float" style={{ opacity: 0.15 }} />
          <div className="absolute -bottom-20 -right-10 h-96 w-96 rounded-full bg-rose blur-3xl animate-float"
            style={{ opacity: 0.15, animationDuration: "16s", animationDirection: "reverse", animationDelay: "2s" }} />
        </div>

        <div className="mx-auto max-w-3xl px-5 pt-16 pb-14 text-center sm:pt-24 sm:pb-20">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <Sparkles className="h-3 w-3" /> Kasuwa · Community marketplace
          </div>
          <h1 className="font-serif text-4xl font-medium leading-[1.05] text-white drop-shadow sm:text-6xl">
            {heroSection?.title ?? "Kasuwa"} <br />
            <span className="italic text-secondary">{heroSection?.subtitle ?? "Shop from Northern Nigeria's Best."}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-white/85">
            {heroSection?.content ?? "Discover trusted local sellers, handmade products, fashion, food, and everyday essentials."}
          </p>

          <form
            onSubmit={submitSearch}
            className="mx-auto mt-7 flex max-w-xl flex-col gap-2 rounded-3xl border border-white/20 bg-card/95 p-2 shadow-warm-lg backdrop-blur sm:flex-row sm:rounded-full"
          >
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
                {NIGERIAN_CITIES.filter((c) => c !== "Other").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" className="h-11 rounded-full bg-primary px-6 text-primary-foreground hover:bg-primary/90">
              Search
            </Button>
          </form>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="group h-12 rounded-full bg-primary px-7 text-base font-medium text-primary-foreground shadow-warm-lg transition hover:bg-primary/90 hover:shadow-warm active:scale-[0.98]">
                <Store className="mr-2 h-5 w-5" />
                Open Your Store · Fara Kasuwanci
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-0.5" />
              </Button>
            </Link>
            {wishlistCount > 0 && (
              <Link to="/wishlist">
                <Button variant="outline" size="lg" className="h-12 rounded-full border-white/30 bg-white/10 px-6 text-white backdrop-blur hover:bg-white/20">
                  <Heart className="mr-2 h-5 w-5 fill-rose-400 text-rose-400" />
                  Saved ({wishlistCount})
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Categories — image-based ── */}
      <section id="categories" className="py-10 scroll-mt-20">
        <div className="mx-auto max-w-5xl px-5 mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl">Browse by category</h2>
            <p className="text-xs text-muted-foreground">Zaɓi kasuwa</p>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-5 grid grid-cols-3 gap-4">
          {categoriesLoading
            ? Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)
            : categories?.map((c) => {
                const { Component: IconComponent } = iconFor(c.name);
                return (
                  <Link
                    key={c.id}
                    to="/category/$slug"
                    params={{ slug: c.slug }}
                    className="group flex flex-col items-center gap-2.5 rounded-2xl border border-[#F0DDD0] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#FDF3EC] transition-transform duration-200 group-hover:scale-105">
                      {(c as any).image_url ? (
                        <img
                          src={(c as any).image_url}
                          alt={c.name}
                          className="h-full w-full object-cover rounded-full"
                        />
                      ) : (
                        <IconComponent size={56} />
                      )}
                    </div>
                    <span className="text-center text-xs font-semibold leading-tight text-foreground">{c.name}</span>
                  </Link>
                );
              })}
        </div>
      </section>

      {/* Explore by City */}
      <ExploreCities />

      {/* ── New sellers ── */}
      <section className="mx-auto max-w-5xl px-5 py-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl">{newSellersSection?.title ?? "New sellers"}</h2>
            <p className="text-xs text-muted-foreground">{newSellersSection?.subtitle ?? "Sababbin masu sayarwa"}</p>
          </div>
          <Link to="/sellers" className="text-xs font-medium text-primary underline underline-offset-2">View all sellers</Link>
        </div>
        <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sellersLoading
            ? Array.from({ length: 4 }).map((_, i) => <SellerSkeleton key={i} />)
            : hasRealSellers
            ? featured!.map((s, i) => (
                <div key={s.id} className="card-enter w-72 shrink-0" style={{ animationDelay: `${i * 0.08}s` }}>
                  <SellerCard {...s} />
                </div>
              ))
            : PLACEHOLDER_SELLERS.map((s, i) => (
                <div key={s.business_name}
                  className="card-enter w-64 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-warm"
                  style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-xl text-primary">{s.initial}</div>
                    <div className="min-w-0">
                      <p className="truncate font-serif text-base font-semibold">{s.business_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.category} · {s.city}</p>
                      <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">Coming soon</span>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* ── Featured products ── */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-serif text-2xl">{featuredSection?.title ?? "Featured products"}</h2>
            <p className="text-xs text-muted-foreground">{featuredSection?.subtitle ?? "Kayan da aka fi so"}</p>
          </div>
          <Link to="/products" className="flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2">
            View all products <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : hasRealProducts ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts!.map((p, i) => {
              const s = (p as any).sellers;
              return (
                <div key={p.id} className="card-enter" style={{ animationDelay: `${i * 0.05}s` }}>
                  <ProductCard
                    id={p.id} name={p.name} price={Number(p.price)}
                    image_url={p.image_url} stock_status={p.stock_status}
                    status={(p as any).status}
                    seller_id={p.seller_id}
                    seller_name={s?.business_name} seller_city={s?.city}
                    seller_slug={s?.slug} whatsapp_number={s?.whatsapp_number ?? ""}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {PLACEHOLDER_PRODUCTS.map((p, i) => (
              <div key={p.name}
                className="card-enter overflow-hidden rounded-2xl border border-border/60 bg-card shadow-warm"
                style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-secondary/60 to-rose/60 text-6xl">{p.emoji}</div>
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

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link to="/products">
            <Button variant="outline" className="rounded-full">
              Browse all products <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          {!hasRealProducts && (
            <Link to="/register" className="text-xs font-medium text-primary underline">
              Be the first to list real products.
            </Link>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
