/**
 * TopBar.tsx
 * Header with logo, city-filter selector, sign-in button (guests only), and bookmark icon.
 *
 * FIX: City / State selector moved into the top-nav so it persists across pages
 * and is always visible. Selection is stored in localStorage (useCityFilter) and
 * picked up by any page that calls the same hook.
 */

import { Link } from "@tanstack/react-router";
import { Bookmark, LogIn, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWishlistCount } from "@/lib/wishlist";
import { useCityFilter, ALL_CITIES } from "@/lib/cityFilter";
import { NIGERIAN_CITIES } from "@/lib/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TopBar() {
  const count = useWishlistCount();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const { city, setCity } = useCityFilter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img
            src="/sutura-logo.png"
            alt="Sutura Market"
            width={80}
            height={80}
            className="h-20 w-20 object-contain"
          />
          <div className="hidden flex-col leading-none sm:flex">
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

        {/* ── City / State selector — centre of the bar ── */}
        <div className="flex-1 max-w-[200px]">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger
              className="h-9 rounded-full border border-border/60 bg-card px-3 text-xs shadow-warm transition hover:border-primary/30 focus:ring-0"
              aria-label="Filter by city"
            >
              <MapPin className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="All cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CITIES}>All cities</SelectItem>
              {NIGERIAN_CITIES.filter((c) => c !== "Other").map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-2">
          {!isSignedIn && (
            <Link
              to="/auth"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 text-xs font-medium shadow-warm transition hover:bg-secondary hover:border-primary/20 active:scale-95"
            >
              <LogIn className="h-4 w-4 text-foreground/70" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
          <Link
            to="/wishlist"
            aria-label={`Bookmarks${count > 0 ? ` (${count})` : ""}`}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card shadow-warm transition hover:bg-secondary hover:border-primary/20 active:scale-95"
          >
            <Bookmark
              className={`h-5 w-5 transition ${count > 0 ? "fill-primary text-primary" : "text-foreground/70"}`}
              strokeWidth={2}
            />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        </div>
      </div>
      <div className="border-shift h-px w-full opacity-40" />
    </header>
  );
}
