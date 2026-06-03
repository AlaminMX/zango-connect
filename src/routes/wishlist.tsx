/**
 * wishlist.tsx — localStorage-backed wishlist page (no account required).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { BackButton } from "@/components/BackButton";
import { Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/lib/wishlist";

export const Route = createFileRoute("/wishlist")({ component: WishlistPage });

function WishlistPage() {
  const items = useWishlist();

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

        {items.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-serif text-2xl">Nothing saved yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Tap the heart icon on any product to save it here. Your list stays on this
              device — no account needed.
            </p>
            <Link to="/">
              <Button className="mt-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                Browse products
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              {items.length} saved item{items.length !== 1 ? "s" : ""}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((it) => (
                <ProductCard
                  key={it.id}
                  id={it.id}
                  name={it.name}
                  price={Number(it.price)}
                  image_url={it.image_url}
                  stock_status={it.stock_status}
                  seller_id={it.seller_id}
                  seller_name={it.seller_name}
                  seller_city={it.seller_city}
                  seller_slug={it.seller_slug}
                  whatsapp_number={it.whatsapp_number}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
