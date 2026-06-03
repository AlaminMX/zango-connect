/**
 * ProductCard.tsx
 * Wishlist heart persists to localStorage (no account required).
 * Admin users see an inline Block / Unblock button.
 */

import { useState, useEffect } from "react";
import { buildWhatsAppUrl, trackClick } from "@/lib/whatsapp";
import { MessageCircle, Heart, ShieldOff, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toggleWishlist, useIsWishlisted } from "@/lib/wishlist";

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  seller_id: string;
  seller_name?: string;
  seller_city?: string;
  seller_slug?: string;
  whatsapp_number: string;
  stock_status?: "available" | "low_stock" | "sold_out" | string;
  status?: "active" | "blocked" | string;
  hideWhatsApp?: boolean;
  isAdmin?: boolean;
  onBlockToggle?: (id: string, newStatus: "active" | "blocked") => void;
}

export function ProductCard(p: ProductCardProps) {
  const storeUrl = p.seller_slug && typeof window !== "undefined"
    ? `${window.location.origin}/store/${p.seller_slug}` : undefined;
  const waUrl = buildWhatsAppUrl(p.whatsapp_number, p.name, storeUrl);
  const soldOut = p.stock_status === "sold_out";
  const low = p.stock_status === "low_stock";
  const isBlocked = p.status === "blocked";

  const saved = useIsWishlisted(p.id);
  const [blocking, setBlocking] = useState(false);
  const [localStatus, setLocalStatus] = useState(p.status ?? "active");

  useEffect(() => { setLocalStatus(p.status ?? "active"); }, [p.status]);

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const nowSaved = toggleWishlist({
      id: p.id,
      name: p.name,
      price: p.price,
      image_url: p.image_url ?? null,
      seller_id: p.seller_id,
      seller_name: p.seller_name,
      seller_city: p.seller_city,
      seller_slug: p.seller_slug,
      whatsapp_number: p.whatsapp_number,
      stock_status: p.stock_status,
    });
    toast(nowSaved ? "Saved to wishlist 💛" : "Removed from wishlist", { duration: 1200 });
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

  const cardOpacity = isBlocked ? "opacity-50" : "";

  return (
    <div className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-warm transition hover:-translate-y-0.5 hover:shadow-warm-lg ${cardOpacity}`}>
      {p.isAdmin && localStatus === "blocked" && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center bg-destructive/90 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Blocked
        </div>
      )}

      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy" decoding="async"
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${soldOut ? "opacity-50 grayscale" : ""}`} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-foreground/85 px-2 py-0.5 text-[10px] font-medium text-background">Sold out</span>
        )}
        {low && !soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-medium text-accent-foreground">Low stock</span>
        )}
        <button onClick={handleSave} aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          className={`absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-background/85 backdrop-blur shadow-sm transition hover:scale-110 active:scale-95 ${saved ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"}`}>
          <Heart className={`h-4 w-4 ${saved ? "fill-rose-500" : ""}`} />
        </button>
      </div>

      <div className="p-3">
        <h4 className="line-clamp-1 font-medium">{p.name}</h4>
        <p className="mt-0.5 font-serif text-lg text-primary">₦{Number(p.price).toLocaleString()}</p>
        {(p.seller_name || p.seller_city) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {p.seller_slug
              ? <Link to="/store/$slug" params={{ slug: p.seller_slug }} className="hover:text-primary hover:underline">{p.seller_name}</Link>
              : p.seller_name}
            {p.seller_name && p.seller_city ? " · " : ""}{p.seller_city}
          </p>
        )}

        {p.isAdmin && (
          <button
            onClick={handleBlock}
            disabled={blocking}
            className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-medium transition ${
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

        {!p.isAdmin && (
          soldOut ? (
            <div className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-muted px-3 py-2 text-sm font-medium text-muted-foreground">Sold out</div>
          ) : !p.hideWhatsApp ? (
            <a href={waUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => trackClick(p.seller_id, p.id)}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--color-whatsapp)] px-3 py-2 text-sm font-medium text-[var(--color-whatsapp-foreground)] transition hover:opacity-90">
              <MessageCircle className="h-4 w-4" /> Order on WhatsApp
            </a>
          ) : null
        )}
      </div>
    </div>
  );
}
