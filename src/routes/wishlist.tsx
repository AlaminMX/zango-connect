/**
 * wishlist.tsx — DB-backed wishlist page.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { BackButton } from "@/components/BackButton";
import { ProductSkeleton } from "@/components/LoadingSpinner";
import { Heart, ShoppingBag, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/wishlist")({ component: WishlistPage });

function WishlistPage() {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: items, isLoading } = useQuery({
    queryKey: ["wishlist", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id, created_at, products(id, name, price, image_url, stock_status, seller_id, sellers(business_name, city, slug, whatsapp_number))")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((r: any) => r.products);
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <BackButton fallback="/" />

        <div className="mt-4 flex items-center gap-3">
          <Heart className="h-6 w-6 fill-rose-400 text-rose-400" />
          <div>
            <h1 className="font-serif text-3xl">Saved Products</h1>
            <p className="text-xs text-muted-foreground">Kayan da aka ajiye</p>
          </div>
        </div>

        {userId === null ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <LogIn className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-serif text-2xl">Sign in to view your saved items</p>
            <p className="max-w-xs text-sm text-muted-foreground">Your wishlist syncs across all your devices when you're signed in.</p>
            <Link to="/auth">
              <Button className="mt-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">Sign in</Button>
            </Link>
          </div>
        ) : isLoading || userId === undefined ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-serif text-2xl">Nothing saved yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">Tap the heart icon on any product to save it here for later.</p>
            <Link to="/">
              <Button className="mt-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">Browse products</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((it: any) => {
                const p = it.products; const s = p.sellers;
                return (
                  <ProductCard
                    key={p.id}
                    id={p.id} name={p.name} price={Number(p.price)}
                    image_url={p.image_url} stock_status={p.stock_status}
                    seller_id={p.seller_id}
                    seller_name={s?.business_name} seller_city={s?.city}
                    seller_slug={s?.slug} whatsapp_number={s?.whatsapp_number ?? ""}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
