/**
 * ProductCard.tsx
 * Wishlist heart persists to the `wishlists` table (RLS scoped to auth.uid()).
 * Unauthenticated users are prompted to sign in.
 * Admin users see an inline Block / Unblock button.
 */

import { useState, useEffect } from "react";
import { buildWhatsAppUrl, trackClick } from "@/lib/whatsapp";
import { MessageCircle, Heart, ShieldOff, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Legacy localStorage helpers — retained for one-time migration.      */
/* ------------------------------------------------------------------ */
const LEGACY_KEY = "sutura_wishlist";

export function getLegacyWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]"); }
  catch { return []; }
}

export function clearLegacyWishlist() {
  if (typeof window !== "undefined") localStorage.removeItem(LEGACY_KEY);
}

/* ------------------------------------------------------------------ */
/* In-memory cache of wishlist ids for the current session.            */
/* ------------------------------------------------------------------ */
let cache: Set<string> | null = null;
const listeners = new Set<() => void>();

async function loadCache(): Promise<Set<string>> {
  if (cache) return cache;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) { cache = new Set(); return cache; }
  const { data } = await supabase.from("wishlists").select("product_id").eq("user_id", u.user.id);
  cache = new Set((data ?? []).map((r: any) => r.product_id));
  return cache;
}

export function invalidateWishlistCache() {
  cache = null;
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => invalidateWishlistCache());
}

/* ------------------------------------------------------------------ */
/* Props                                                                */
/* ------------------------------------------------------------------ */
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
  /** When true, shows inline block/unblock controls */
  isAdmin?: boolean;
  /** Called after admin toggles block status so parent can update list */
  onBlockToggle?: (id: string, newStatus: "active" | "blocked") => void;
}

export function ProductCard(p: ProductCardProps) {
  const nav = useNavigate();
  const storeUrl = p.seller_slug && typeof window !== "undefined"
    ? `${window.location.origin}/store/${p.seller_slug}` : undefined;
  const waUrl = buildWhatsAppUrl(p.whatsapp_number, p.name, storeUrl);
  const soldOut = p.stock_status === "sold_out";
  const low = p.stock_status === "low_stock";
  const isBlocked = p.status === "blocked";

  const [saved, setSaved] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [localStatus, setLocalStatus] = useState(p.status ?? "active");

  useEffect(() => { setLocalStatus(p.status ?? "active"); }, [p.status]);

  useEffect(() => {
    let alive = true;
    const update = async () => {
      const c = await loadCache();
      if (alive) setSaved(c.has(p.id));
    };
    update();
    listeners.add(update);
    return () => { alive = false; listeners.delete(update); };
  }, [p.id]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast("Sign in to save items", {
        description: "Your wishlist syncs across devices when you're signed in.",
        action: { label: "Sign in", onClick: () => nav({ to: "/auth" }) },
      });
      return;
    }
    if (saved) {
      const { error } = await supabase.from("wishlists").delete()
        .eq("user_id", u.user.id).eq("product_id", p.id);
      if (error) { toast.error(error.message); return; }
      toast("Removed from wishlist", { duration: 1500 });
    } else {
      const { error } = await supabase.from("wishlists").insert({
        user_id: u.user.id, product_id: p.id,
      });
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        toast.error(error.message); return;
      }
      toast("Saved to wishlist 💛", { duration: 1500 });
    }
    invalidateWishlistCache();
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
      {/* Admin block badge overlay */}
      {p.isAdmin && localStatus === "blocked" && (
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center bg-destructive/90 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Blocked
        </div>
      )}

      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy"
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
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 backdrop-blur shadow-sm transition hover:scale-110 active:scale-95 ${saved ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"}`}>
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

        {/* Admin block/unblock inline button */}
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
