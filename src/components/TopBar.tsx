/**
 * TopBar.tsx
 * Header with logo + wishlist icon. No visible auth UI (MVP).
 */

import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useWishlistCount } from "@/lib/wishlist";

export function TopBar() {
  const count = useWishlistCount();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/sutura-logo.png"
            alt="Sutura Market"
            width={80}
            height={80}
            className="h-20 w-20 object-contain"
          />
          <div className="flex flex-col leading-none">
            <span
              className="font-serif text-lg font-bold tracking-wide text-primary"
              style={{ letterSpacing: "0.08em" }}
            >
              SUTURA
            </span>
            <span
              className="font-serif text-sm font-semibold tracking-widest text-foreground/70"
              style={{ letterSpacing: "0.15em" }}
            >
              MARKET
            </span>
          </div>
        </Link>

        {/* Wishlist */}
        <Link
          to="/wishlist"
          aria-label={`Wishlist${count > 0 ? ` (${count})` : ""}`}
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card shadow-warm transition hover:bg-secondary hover:border-primary/20 active:scale-95"
        >
          <Heart
            className={`h-5 w-5 transition ${count > 0 ? "fill-rose-500 text-rose-500" : "text-foreground/70"}`}
            strokeWidth={2}
          />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
      </div>
      <div className="border-shift h-px w-full opacity-40" />
    </header>
  );
}
