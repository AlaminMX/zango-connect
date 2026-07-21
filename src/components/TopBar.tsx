import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark, LogIn, Menu } from "lucide-react";
import { useWishlistCount } from "@/lib/wishlist";
import { useAuth } from "@/lib/authContext";
import { useSellerProfile } from "@/lib/sellerProfile";
import { NavSidebar } from "@/components/NavSidebar";

export function TopBar() {
  const count = useWishlistCount();
  const { user, isReady } = useAuth();
  const { seller } = useSellerProfile();
  const isSignedIn = isReady ? !!user : null;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img
            src="/zango-logo.png"
            alt="ZANGO"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
          />
          <div className="flex flex-col leading-none">
            <span className="font-display text-xl text-espresso">ZANGO</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sage-deep">
              Kasuwancin Arewa
            </span>
          </div>
        </Link>

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
