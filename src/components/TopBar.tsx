import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, LogIn, MapPin, Menu } from "lucide-react";
import { useWishlistCount } from "@/lib/wishlist";
import { useCity } from "@/lib/cityContext";
import { useAuth } from "@/lib/authContext";
import { useSellerProfile } from "@/lib/sellerProfile";
import { NavSidebar } from "@/components/NavSidebar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export function TopBar() {
  const count = useWishlistCount();
  const { user, isReady } = useAuth();
  const { seller } = useSellerProfile();
  const isSignedIn = isReady ? !!user : null;
  const { selectedCity, setSelectedCity, activeCities } = useCity();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img
            src="/sutura-logo.png"
            alt="Sutura Market"
            width={56}
            height={56}
            className="h-12 w-12 object-contain"
          />
          <div className="hidden flex-col leading-none sm:flex">
            <span className="font-display text-xl text-espresso">Sutura</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sage-deep">
              Arewa Market
            </span>
          </div>
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger
              className="h-9 w-auto max-w-[200px] rounded-full border border-border-warm bg-white px-3 text-xs shadow-sm transition hover:border-primary/40 focus:ring-0 [&>svg]:ml-1"
              aria-label="Select state"
            >
              <MapPin className="mr-1 h-3.5 w-3.5 shrink-0 text-primary" />
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All states</SelectItem>
              {activeCities.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isSignedIn === false && (
            <Link
              to="/auth"
              className="hidden h-9 items-center gap-1.5 rounded-full border border-border-warm bg-white px-3.5 text-xs font-medium text-espresso shadow-sm transition hover:border-primary/40 hover:bg-surface-warm active:scale-95 sm:inline-flex"
            >
              <LogIn className="h-4 w-4 text-sage-deep" />
              <span>Sign in</span>
            </Link>
          )}
          {seller ? (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-warm bg-white shadow-sm transition hover:border-primary/40 hover:bg-surface-warm active:scale-95"
            >
              <Menu className="h-5 w-5 text-espresso/70" strokeWidth={2} />
            </button>
          ) : (
            <Link
              to="/wishlist"
              aria-label={`Saved${count > 0 ? ` (${count})` : ""}`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border-warm bg-white shadow-sm transition hover:border-primary/40 hover:bg-surface-warm active:scale-95"
            >
              <Bookmark
                className={`h-5 w-5 transition ${count > 0 ? "fill-primary text-primary" : "text-espresso/70"}`}
                strokeWidth={2}
              />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
      <div className="border-shift h-px w-full opacity-50" />
      <NavSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
    </header>
  );
}
