/**
 * BottomNav — context-aware bottom navigation.
 *   • Buyer (no seller profile): Home / Explore / Wishlist
 *   • Seller (approved or pending): Home / Explore / + (floating) / My Products / My Store
 *   • Admin: Home / Admin / Sign Out
 *
 * Pulls seller state from useSellerProfile (shared query) — never fires its own
 * supabase call, so the nav never flashes the wrong shape on auth transitions.
 */
import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Bookmark, Plus, Store, LayoutGrid, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { useSellerProfile } from "@/lib/sellerProfile";
import { useWishlistCount } from "@/lib/wishlist";
import { ProductSheet } from "@/components/ProductSheet";
import { toast } from "sonner";

const tabBase =
  "flex flex-1 min-h-[44px] flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors duration-100";

export function BottomNav() {
  const { isReady, isAdmin, signOut } = useAuth();
  const { seller } = useSellerProfile();
  const wishCount = useWishlistCount();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const nav = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!isReady) return <div className="h-16" aria-hidden />;

  const active = (path: string) => pathname === path || pathname.startsWith(path + "/");
  const cls = (path: string) =>
    `${tabBase} ${active(path) ? "text-primary" : "text-muted-foreground hover:text-foreground"}`;

  const handleSignOut = async () => {
    try { await signOut(); toast.success("Signed out"); nav({ to: "/", replace: true }); }
    catch (e: any) { toast.error(e?.message ?? "Sign out failed"); }
  };

  // ── ADMIN ──
  if (isAdmin) {
    return (
      <>
        <div className="h-16" aria-hidden />
        <nav className="fixed bottom-0 inset-x-0 z-50 flex h-16 items-stretch border-t border-border-warm bg-card/95 backdrop-blur-md shadow-[0_-2px_12px_rgba(62,39,35,0.08)]">
          <Link to="/" className={cls("/")}><Home className="h-5 w-5" /> Home</Link>
          <Link to="/admin" className={cls("/admin")}><Shield className="h-5 w-5" /> Admin</Link>
          <button type="button" onClick={handleSignOut} className={`${tabBase} text-muted-foreground hover:text-destructive`}>
            <LogOut className="h-5 w-5" /> Sign out
          </button>
        </nav>
      </>
    );
  }

  // ── SELLER ──
  if (seller) {
    const storeHref = `/store/${seller.slug}`;
    return (
      <>
        <div className="h-16" aria-hidden />
        <nav className="fixed bottom-0 inset-x-0 z-50 flex h-16 items-stretch border-t border-border-warm bg-card/95 backdrop-blur-md shadow-[0_-2px_12px_rgba(62,39,35,0.08)]">
          <Link to="/" className={cls("/")}><Home className="h-5 w-5" /> Home</Link>
          <Link to="/explore" className={cls("/explore")}><Compass className="h-5 w-5" /> Explore</Link>

          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              onClick={() => {
                if (seller.verification_status !== "approved") {
                  toast.info("Your store is under review. You can add products once approved.");
                  return;
                }
                setSheetOpen(true);
              }}
              aria-label="Add product"
              className="relative -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-warm-lg transition active:scale-95 hover:bg-primary/90"
            >
              <Plus className="h-7 w-7" />
            </button>
          </div>

          <Link to="/seller/products" className={cls("/seller/products")}>
            <LayoutGrid className="h-5 w-5" /> Products
          </Link>
          <Link to={storeHref} className={cls(storeHref)}>
            <Store className="h-5 w-5" /> My store
          </Link>
        </nav>

        <ProductSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          mode="add"
          sellerId={seller.id}
          sellerSlug={seller.slug}
        />
      </>
    );
  }

  // ── BUYER ──
  return (
    <>
      <div className="h-16" aria-hidden />
      <nav className="fixed bottom-0 inset-x-0 z-50 flex h-16 items-stretch border-t border-border-warm bg-card/95 backdrop-blur-md shadow-[0_-2px_12px_rgba(62,39,35,0.08)]">
        <Link to="/" className={cls("/")}><Home className="h-5 w-5" /> Home</Link>
        <Link to="/explore" className={cls("/explore")}><Compass className="h-5 w-5" /> Explore</Link>
        <Link to="/wishlist" className={`${cls("/wishlist")} relative`}>
          <span className="relative">
            <Bookmark className={`h-5 w-5 ${wishCount > 0 ? "fill-primary text-primary" : ""}`} />
            {wishCount > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                {wishCount > 99 ? "99+" : wishCount}
              </span>
            )}
          </span>
          Wishlist
        </Link>
      </nav>
    </>
  );
}
