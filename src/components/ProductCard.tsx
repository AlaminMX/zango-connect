/**
 * ProductCard — image, name, price/"Price on request", seller link, wishlist heart.
 * Whole card navigates to /product/:id (except the heart and admin block button).
 * WhatsApp CTA lives on the product detail page and wishlist, not on the card.
 */

import { useEffect, useState, memo } from "react";
import { Heart, ShieldOff, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toggleWishlist, useIsWishlisted } from "@/lib/wishlist";

export interface ProductCardProps {
  id: string;
  name: string;
  price: number | null;
  image_url?: string | null;
  seller_id: string;
  seller_name?: string;
  seller_city?: string;
  seller_slug?: string;
  whatsapp_number: string;
  stock_status?: "available" | "low_stock" | "sold_out" | string;
  status?: "active" | "blocked" | string;
  isAdmin?: boolean;
  onBlockToggle?: (id: string, newStatus: "active" | "blocked") => void;
}

function ProductCardContent(p: ProductCardProps) {
  const nav = useNavigate();
  const soldOut = p.stock_status === "sold_out";
  const low = p.stock_status === "low_stock";
  const isBlocked = p.status === "blocked";

  const saved = useIsWishlisted(p.id);
  const [blocking, setBlocking] = useState(false);
  const [localStatus, setLocalStatus] = useState(p.status ?? "active");

  useEffect(() => { setLocalStatus(p.status ?? "active"); }, [p.status]);

  // Note: memo prevents re-renders when parent re-renders without prop changes

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const nowSaved = toggleWishlist({
      id: p.id, name: p.name, price: Number(p.price ?? 0),
      image_url: p.image_url ?? null, seller_id: p.seller_id,
      seller_name: p.seller_name, seller_city: p.seller_city,
      seller_slug: p.seller_slug, whatsapp_number: p.whatsapp_number,
      stock_status: p.stock_status,
    });
    toast(nowSaved ? "Saved to wishlist" : "Removed from wishlist", { duration: 1200 });
  };

  const handleBlock = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setBlocking(true);
    const newStatus = localStatus === "active" ? "blocked" : "active";
    const { error } = await supabase.from("products").update({ status: newStatus }).eq("id", p.id);
    setBlocking(false);
    if (error) { toast.error(error.message); return; }
    setLocalStatus(newStatus);
    toast.success(newStatus === "blocked" ? "Product blocked" : "Product unblocked");
    p.onBlockToggle?.(p.id, newStatus);
  };

  const goToProduct = () => nav({ to: "/product/$id", params: { id: p.id } });

  return (
    <div
      role="link" tabIndex={0}
      onClick={goToProduct}
      onKeyDown={(e) => { if (e.key === "Enter") goToProduct(); }}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-border-warm bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-warm-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${isBlocked ? "opacity-50" : ""}`}
    >
      {p.isAdmin && localStatus === "blocked" && (
        <div className="absolute inset-x-3 top-3 z-20 rounded-full bg-destructive/90 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-white">
          Blocked
        </div>
      )}

      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-surface-warm">
        {p.image_url ? (
          <img
            src={p.image_url} alt={p.name} loading="lazy" decoding="async"
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs italic text-muted-foreground">No image</div>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-espresso/90 px-2 py-0.5 text-[10px] font-medium text-background">Out of stock</span>
        )}
        {low && !soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-sage px-2 py-0.5 text-[10px] font-medium text-white">Low stock</span>
        )}
        <button
          type="button" onClick={handleSave}
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          className={`absolute right-2 top-2 flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:scale-110 active:scale-95 ${saved ? "text-primary" : "text-espresso/60 hover:text-primary"}`}
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-primary" : ""}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <h4 className="line-clamp-1 font-medium text-espresso">{p.name}</h4>
        {(p.seller_name || p.seller_city) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {p.seller_slug ? (
              <Link
                to="/store/$slug" params={{ slug: p.seller_slug }}
                onClick={(e) => e.stopPropagation()}
                className="hover:text-primary hover:underline"
              >{p.seller_name}</Link>
            ) : p.seller_name}
            {p.seller_name && p.seller_city ? " · " : ""}
            {p.seller_city && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                📍 {p.seller_city}
              </span>
            )}
          </p>
        )}
        <p className="mt-2 font-display text-lg text-sage-deep">
          {p.price != null && Number(p.price) > 0
            ? `₦${Number(p.price).toLocaleString()}`
            : <span className="text-sm italic text-muted-foreground">Price on request</span>}
        </p>

        {p.isAdmin && (
          <button
            type="button" onClick={handleBlock} disabled={blocking}
            className={`mt-3 flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition ${
              localStatus === "blocked"
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-destructive/10 text-destructive hover:bg-destructive/20"
            }`}
          >
            {localStatus === "blocked"
              ? <><ShieldCheck className="h-3.5 w-3.5" /> Unblock</>
              : <><ShieldOff className="h-3.5 w-3.5" /> Block</>}
          </button>
        )}
      </div>
    </div>
  );
}

export const ProductCard = memo(ProductCardContent);
