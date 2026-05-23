import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { SellerCard } from "@/components/SellerCard";
import { Button } from "@/components/ui/button";
import { Sparkles, Clock, MapPin, Star } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

const PLACEHOLDER_SELLERS = [
  { business_name: "Zainab's Kitchen", category: "Food & Drinks", city: "Kano", initial: "Z" },
  { business_name: "Khadija Fabrics", category: "Fashion", city: "Kaduna", initial: "K" },
  { business_name: "Fati Glow Beauty", category: "Beauty", city: "Abuja", initial: "F" },
];

function Index() {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["featured-sellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const hasRealSellers = (featured?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-warm opacity-60" />
        {/* Floating orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: -5 }}>
          <div
            className="absolute -left-10 top-6 h-72 w-72 rounded-full bg-primary blur-3xl animate-float"
            style={{ opacity: 0.15 }}
          />
          <div
            className="absolute -bottom-20 -right-10 h-96 w-96 rounded-full bg-secondary blur-3xl animate-float"
            style={{ opacity: 0.2, animationDuration: "16s", animationDirection: "reverse", animationDelay: "2s" }}
          />
          <div
            className="absolute right-8 top-4 h-56 w-56 rounded-full bg-accent blur-3xl animate-float"
            style={{ opacity: 0.1, animationDuration: "20s", animationDelay: "4s" }}
          />
        </div>
        <div className="mx-auto max-w-3xl px-5 pt-12 pb-16 text-center sm:pt-20 sm:pb-24">
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
            <Sparkles className="h-3 w-3" /> Community marketplace
          </div>
          <h1 className="font-serif text-5xl font-medium leading-[1.05] text-foreground sm:text-6xl">
            Your Business,<br />
            <span className="italic text-primary">Discovered.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground">
            The marketplace built for northern Nigeria's women entrepreneurs.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#categories" className="w-full sm:w-auto">
              <Button size="lg" className="w-full rounded-full bg-primary px-7 text-primary-foreground hover:bg-primary/90">
                Find a Seller
              </Button>
            </a>
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full rounded-full border-primary/30 px-7 text-primary hover:bg-primary/5">
                List Your Business
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" className="mx-auto max-w-5xl px-5 py-10 scroll-mt-20">
        <h2 className="mb-5 font-serif text-2xl">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="shimmer group rounded-2xl border border-border/60 bg-card p-4 shadow-warm transition hover:-translate-y-0.5 hover:shadow-warm-lg"
            >
              <div className="relative z-[2] text-3xl">{c.icon_emoji}</div>
              <div className="relative z-[2] mt-3 font-serif text-base leading-tight">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured sellers */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-serif text-2xl">Featured sellers</h2>
        </div>
        {hasRealSellers ? (
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured!.map((s, i) => (
              <div key={s.id} className="card-enter w-72 shrink-0" style={{ animationDelay: `${i * 0.1}s` }}>
                <SellerCard {...s} />
              </div>
            ))}
          </div>
        ) : (
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PLACEHOLDER_SELLERS.map((s, i) => (
              <div
                key={s.business_name}
                className="card-enter w-72 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-warm"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary font-serif text-xl text-primary">
                    {s.initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate font-serif text-lg font-semibold leading-tight">{s.business_name}</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        <Clock className="h-2.5 w-2.5" /> Coming Soon
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.category}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" />5.0</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/50 bg-muted/40 px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">
                  Reserved spot
                </div>
              </div>
            ))}
          </div>
        )}
        {!hasRealSellers && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link to="/register" className="font-medium text-primary underline">Be the first real seller to join.</Link>
          </p>
        )}
      </section>

      <Footer />
    </div>
  );
}
