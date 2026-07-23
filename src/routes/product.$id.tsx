/**
 * /product/$id — product detail page with image gallery, WhatsApp CTA, wishlist toggle.
 */
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackView } from "@/lib/viewTracking";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { ProductCard } from "@/components/ProductCard";
import { PageLoader } from "@/components/LoadingSpinner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl, trackClick } from "@/lib/whatsapp";
import { toggleWishlist, useIsWishlisted } from "@/lib/wishlist";
import { Heart, MessageCircle, MapPin } from "lucide-react";
import { toast } from "sonner";

import { assertLaunchGate } from "@/lib/launchGate";
export const Route = createFileRoute("/product/$id")({ beforeLoad: assertLaunchGate, component: ProductDetail });

function ProductDetail() {
  const { id } = useParams({ from: "/product/$id" });
  const [activeImg, setActiveImg] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, description, image_url, image_urls, stock_status, status, seller_id, sellers!inner(id, slug, business_name, city, category, whatsapp_number, profile_photo_url, is_verified, is_blocked, verification_status)")
        .eq("id", id)
        .abortSignal(AbortSignal.timeout(8000))
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const saved = useIsWishlisted(id);

  // Log a product view — once per mount. Unlike store.$slug.tsx, this page
  // has no owner/admin session detection today, so unlike the store-view
  // tracker above this can't exclude the seller's own visits yet. Worth
  // knowing before you treat this number as precise.
  const viewLoggedRef = useRef(false);
  useEffect(() => {
    if (!data || viewLoggedRef.current) return;
    viewLoggedRef.current = true;
    trackView("product", data.id, data.seller_id);
  }, [data]);

  if (isLoading) return <PageLoader label="Loading product…" />;
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-2xl px-5 py-20 text-center">
          <BackButton fallback="/" />
          <p className="mt-6 font-display text-2xl">Product not found</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">Back to home</Link>
        </div>
      </div>
    );
  }

  const p: any = data;
  const seller = p.sellers;
  const sellerVisible = seller && !seller.is_blocked && seller.verification_status === "approved" && p.status === "active";
  if (!sellerVisible) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-2xl px-5 py-20 text-center">
          <BackButton fallback="/" />
          <p className="mt-6 font-display text-2xl">This product is unavailable</p>
        </div>
      </div>
    );
  }

  const imgs: string[] = (p.image_urls && p.image_urls.length > 0) ? p.image_urls
    : p.image_url ? [p.image_url] : [];
  const mainImg = imgs[activeImg] ?? imgs[0];
  const soldOut = p.stock_status === "sold_out";

  const storeUrl = typeof window !== "undefined" ? `${window.location.origin}/store/${seller.slug}` : undefined;
  const priceLabel = p.price != null ? `₦${Number(p.price).toLocaleString()}` : "Price on request";
  const waMessage = `Hi! I found your product on Sutura Market — ${p.name}${p.price != null ? ` (${priceLabel})` : ""}. Is it available?${storeUrl ? `\n\nStore: ${storeUrl}` : ""}`;
  const waUrl = `https://wa.me/${(seller.whatsapp_number ?? "").replace(/\D/g, "").replace(/^0/, "234")}?text=${encodeURIComponent(waMessage)}`;
  const fallbackWa = buildWhatsAppUrl(seller.whatsapp_number, p.name, storeUrl);

  const handleWa = () => trackClick(seller.id, p.id);

  const handleSave = () => {
    const now = toggleWishlist({
      id: p.id, name: p.name, price: Number(p.price ?? 0),
      image_url: mainImg ?? null, seller_id: seller.id,
      seller_name: seller.business_name, seller_city: seller.city,
      seller_slug: seller.slug, whatsapp_number: seller.whatsapp_number,
      stock_status: p.stock_status,
    });
    toast(now ? "Saved to wishlist" : "Removed from wishlist", { duration: 1200 });
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-5xl px-5 py-6">
        <BackButton fallback="/" />

        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="aspect-square overflow-hidden rounded-3xl border border-border-warm bg-surface-warm">
              {mainImg ? (
                <img src={mainImg} alt={p.name} className={`h-full w-full object-cover ${soldOut ? "opacity-60 grayscale" : ""}`} />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">No image</div>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {imgs.map((url, i) => (
                  <button
                    key={url + i} type="button"
                    onClick={() => setActiveImg(i)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition ${i === activeImg ? "border-primary" : "border-border-warm hover:border-primary/40"}`}
                    aria-label={`View image ${i + 1}`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <Link
              to="/store/$slug" params={{ slug: seller.slug }}
              className="group inline-flex items-center gap-3"
            >
              <div className="h-10 w-10 overflow-hidden rounded-full bg-surface-warm ring-2 ring-border-warm">
                {seller.profile_photo_url ? (
                  <img src={seller.profile_photo_url} alt={seller.business_name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-base text-primary">
                    {seller.business_name?.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="flex items-center gap-1 font-semibold text-espresso group-hover:text-primary">
                  {seller.business_name}
                  {seller.is_verified && <VerifiedBadge className="h-4 w-4" />}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {seller.city}
                </p>
              </div>
            </Link>

            <h1 className="mt-5 font-display text-3xl text-espresso sm:text-4xl">{p.name}</h1>
            <p className="mt-2 font-display text-2xl text-sage-deep">{priceLabel}</p>

            {soldOut && (
              <div className="mt-3 inline-block rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                Currently out of stock
              </div>
            )}

            {p.description && (
              <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{p.description}</p>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {soldOut ? (
                <Button disabled className="min-h-[48px] flex-1 rounded-full bg-muted text-muted-foreground">
                  Currently out of stock
                </Button>
              ) : (
                <a
                  href={waUrl || fallbackWa}
                  target="_blank" rel="noopener noreferrer"
                  onClick={handleWa}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-warm-lg transition hover:bg-primary/90 active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" /> Order on WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={handleSave}
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-border-warm bg-card px-5 text-sm font-medium transition hover:border-primary ${saved ? "text-primary" : "text-espresso"}`}
              >
                <Heart className={`h-4 w-4 ${saved ? "fill-primary" : ""}`} />
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        </div>

        <RelatedProducts sellerId={seller.id} excludeId={p.id} />
      </main>
      <Footer />
    </div>
  );
}

function RelatedProducts({ sellerId, excludeId }: { sellerId: string; excludeId: string }) {
  const { data } = useQuery({
    queryKey: ["product-related", sellerId, excludeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, image_url, stock_status, seller_id, sellers!inner(business_name, city, slug, whatsapp_number, is_blocked, verification_status)")
        .eq("seller_id", sellerId).eq("status", "active")
        .neq("id", excludeId)
        .order("created_at", { ascending: false })
        .limit(4)
        .abortSignal(AbortSignal.timeout(8000));
      return (data ?? []).filter((p: any) => !p.sellers?.is_blocked && p.sellers?.verification_status === "approved");
    },
  });

  if (!data || data.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="mb-4 font-display text-2xl text-espresso">More from this seller</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.map((p: any) => (
          <ProductCard
            key={p.id} id={p.id} name={p.name} price={Number(p.price ?? 0)}
            image_url={p.image_url} stock_status={p.stock_status}
            seller_id={p.seller_id}
            seller_name={p.sellers?.business_name}
            seller_city={p.sellers?.city}
            seller_slug={p.sellers?.slug}
            whatsapp_number={p.sellers?.whatsapp_number}
          />
        ))}
      </div>
    </section>
  );
}
