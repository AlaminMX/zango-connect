/**
 * wishlist.tsx — saved items with per-seller WhatsApp ordering.
 * Stored in localStorage (no account required). Each item gets its own
 * WhatsApp button; multi-seller wishlists open a sheet that links to
 * each seller separately so the browser doesn't block popups.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Bookmark, ShoppingBag, MessageCircle, X, Heart } from "lucide-react";
import { useWishlist, removeFromWishlist, type WishlistItem } from "@/lib/wishlist";
import { trackClick } from "@/lib/whatsapp";

export const Route = createFileRoute("/wishlist")({ component: WishlistPage });

function naira(n: number) { return `₦${n.toLocaleString()}`; }

function buildOrderUrl(item: WishlistItem) {
  const phone = (item.whatsapp_number ?? "").replace(/\D/g, "").replace(/^0/, "234");
  const priceLine = item.price > 0 ? ` (${naira(Number(item.price))})` : "";
  const msg = `Hi! I'd like to order ${item.name}${priceLine} from your store on Sutura Market. Is it available?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function buildOrderAllUrl(sellerItems: WishlistItem[]) {
  const phone = (sellerItems[0].whatsapp_number ?? "").replace(/\D/g, "").replace(/^0/, "234");
  const lines = sellerItems.map((i) => `• ${i.name}${i.price > 0 ? ` — ${naira(Number(i.price))}` : ""}`).join("\n");
  const msg = `Hi! I'd like to order these items from your Sutura Market store:\n\n${lines}\n\nAre they available?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function WishlistPage() {
  const items = useWishlist();
  const [orderAllOpen, setOrderAllOpen] = useState(false);

  const groupedBySeller = useMemo(() => {
    const map = new Map<string, { sellerName: string; sellerSlug?: string; items: WishlistItem[] }>();
    items.forEach((it) => {
      const key = it.seller_id;
      const e = map.get(key);
      if (e) e.items.push(it);
      else map.set(key, { sellerName: it.seller_name ?? "Seller", sellerSlug: it.seller_slug, items: [it] });
    });
    return [...map.entries()];
  }, [items]);

  const total = items.reduce((sum, i) => sum + (Number(i.price) > 0 ? Number(i.price) : 0), 0);
  const hasMultipleSellers = groupedBySeller.length >= 2;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <BackButton fallback="/" />

        <div className="mt-4 flex items-center gap-3">
          <Bookmark className="h-6 w-6 fill-primary text-primary" />
          <div>
            <h1 className="font-display text-3xl text-espresso">Wishlist</h1>
            <p className="text-xs text-muted-foreground">Abubuwan da Ka Ajiye</p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-display text-2xl text-espresso">Nothing saved yet</p>
            <p className="text-xs text-muted-foreground">Ba a ajiye komai ba</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Tap the heart on any product to save it here. Your list stays on this device — no account needed.
            </p>
            <Link to="/">
              <Button className="mt-2 min-h-[44px] rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                Start browsing
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border-warm bg-card p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total value</p>
                <p className="font-display text-2xl text-sage-deep">
                  {total > 0 ? naira(total) : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"}</p>
              </div>
              {hasMultipleSellers && (
                <Button onClick={() => setOrderAllOpen(true)} className="min-h-[44px] rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <MessageCircle className="mr-2 h-4 w-4" /> Order all
                </Button>
              )}
            </div>

            <ul className="mt-5 space-y-3">
              {items.map((it) => {
                const url = buildOrderUrl(it);
                const out = it.stock_status === "sold_out";
                return (
                  <li key={it.id} className="flex gap-3 rounded-3xl border border-border-warm bg-card p-3">
                    <Link to="/product/$id" params={{ id: it.id }} className="shrink-0">
                      <div className="h-20 w-20 overflow-hidden rounded-2xl bg-surface-warm">
                        {it.image_url ? <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" loading="lazy" /> : null}
                      </div>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link to="/product/$id" params={{ id: it.id }} className="min-w-0">
                          <p className="line-clamp-1 font-semibold text-espresso hover:text-primary">{it.name}</p>
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeFromWishlist(it.id)}
                          aria-label="Remove from wishlist"
                          className="flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        ><X className="h-4 w-4" /></button>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {it.seller_slug ? (
                          <Link to="/store/$slug" params={{ slug: it.seller_slug }} className="hover:text-primary hover:underline">
                            {it.seller_name}
                          </Link>
                        ) : it.seller_name}
                        {it.seller_city ? ` · ${it.seller_city}` : ""}
                      </p>
                      <p className="mt-1 font-display text-sage-deep">
                        {Number(it.price) > 0 ? naira(Number(it.price)) : <span className="text-sm italic text-muted-foreground">Price on request</span>}
                      </p>
                      <div className="mt-2">
                        {out ? (
                          <span className="inline-flex rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">Out of stock</span>
                        ) : (
                          <a
                            href={url} target="_blank" rel="noopener noreferrer"
                            onClick={() => trackClick(it.seller_id, it.id)}
                            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Order on WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </main>
      <Footer />

      <Sheet open={orderAllOpen} onOpenChange={setOrderAllOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Order from each seller</SheetTitle>
            <SheetDescription className="text-xs">
              Browsers block opening multiple WhatsApp chats at once. Tap each seller below to send your order.
            </SheetDescription>
          </SheetHeader>
          <ul className="mt-4 space-y-2">
            {groupedBySeller.map(([sellerId, { sellerName, items: its }]) => (
              <li key={sellerId}>
                <a
                  href={buildOrderAllUrl(its)} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackClick(sellerId)}
                  className="flex min-h-[60px] items-center justify-between gap-3 rounded-2xl border border-border-warm bg-card p-3 transition hover:border-primary"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-semibold text-espresso">{sellerName}</p>
                    <p className="text-xs text-muted-foreground">{its.length} item{its.length === 1 ? "" : "s"}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    <MessageCircle className="h-3.5 w-3.5" /> Order
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
            <Heart className="h-3 w-3 fill-primary text-primary" /> Saved items stay on your device.
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
