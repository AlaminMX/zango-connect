/**
 * NavSidebar — left-side navigation drawer for sellers.
 * Replaces the wishlist bookmark icon in TopBar (for sellers only) so sellers
 * get one tap to everything: home, explore, their store, products, wishlist,
 * and sign out. Buyers never see this — they keep the bookmark icon as-is.
 *
 * NOTE: "My store" wasn't explicitly on the requested list (Home / Explore /
 * Products / Wishlist / Sign out) — added it because without it there's no
 * quick way back to your own store from anywhere except the bottom nav's
 * "My store" tab, which felt like a gap. Trivial to remove if unwanted.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { Home, Compass, Store, LayoutGrid, Bookmark, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/authContext";
import { useSellerProfile } from "@/lib/sellerProfile";
import { useWishlistCount } from "@/lib/wishlist";
import { canBypassLaunchGate } from "@/lib/launchGate";
import { toast } from "sonner";

interface NavSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NavSidebar({ open, onOpenChange }: NavSidebarProps) {
  const { isAdmin, signOut } = useAuth();
  const { seller } = useSellerProfile();
  const wishCount = useWishlistCount();
  const nav = useNavigate();
  const bypass = canBypassLaunchGate(isAdmin, seller?.business_name);

  const close = () => onOpenChange(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
      close();
      nav({ to: "/", replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Sign out failed");
    }
  };

  const itemCls =
    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-espresso transition hover:bg-surface-warm active:scale-[0.98]";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-72 flex-col gap-1 p-4">
        <SheetHeader className="mb-2 text-left">
          <SheetTitle className="font-display text-xl text-espresso">Menu</SheetTitle>
        </SheetHeader>

        {bypass && (
          <>
            <Link to="/" onClick={close} className={itemCls}>
              <Home className="h-5 w-5 text-primary" /> Home
            </Link>
            <Link to="/explore" onClick={close} className={itemCls}>
              <Compass className="h-5 w-5 text-primary" /> Explore
            </Link>
          </>
        )}
        {seller && bypass && (
          <Link
            to="/store/$slug"
            params={{ slug: seller.slug }}
            onClick={close}
            className={itemCls}
          >
            <Store className="h-5 w-5 text-primary" /> My store
          </Link>
        )}
        <Link to="/seller/products" onClick={close} className={itemCls}>
          <LayoutGrid className="h-5 w-5 text-primary" /> Products
        </Link>
        {bypass && (
          <Link to="/wishlist" onClick={close} className={`${itemCls} justify-between`}>
            <span className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-primary" /> Wishlist
            </span>
            {wishCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {wishCount > 99 ? "99+" : wishCount}
              </span>
            )}
          </Link>
        )}

        <div className="my-2 h-px bg-border-warm" />

        <button
          type="button"
          onClick={handleSignOut}
          className={`${itemCls} text-destructive hover:bg-destructive/10`}
        >
          <LogOut className="h-5 w-5" /> Sign out
        </button>
      </SheetContent>
    </Sheet>
  );
}
