import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { SellerCard } from "@/components/SellerCard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({ component: Index });

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

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-warm opacity-60" />
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
            <Link to="/category/$slug" params={{ slug: "fashion" }} className="w-full sm:w-auto">
              <Button size="lg" className="w-full rounded-full bg-primary px-7 text-primary-foreground hover:bg-primary/90">
                Find a Seller
              </Button>
            </Link>
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full rounded-full border-primary/30 px-7 text-primary hover:bg-primary/5">
                List Your Business
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="mb-5 font-serif text-2xl">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories?.map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="group rounded-2xl border border-border/60 bg-card p-4 shadow-warm transition hover:-translate-y-0.5 hover:shadow-warm-lg"
            >
              <div className="text-3xl">{c.icon_emoji}</div>
              <div className="mt-3 font-serif text-base leading-tight">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured sellers */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-serif text-2xl">Featured sellers</h2>
        </div>
        {featured && featured.length > 0 ? (
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((s) => (
              <div key={s.id} className="w-72 shrink-0">
                <SellerCard {...s} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            No sellers yet. <Link to="/register" className="font-medium text-primary underline">Be the first to join.</Link>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
