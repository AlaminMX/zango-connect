/**
 * SellerBottomNav.tsx
 * Persistent bottom navigation for authenticated sellers.
 * Tabs: Home · Add Product (centre) · Profile
 *
 * • Only renders when the current user has a seller profile.
 * • "Add Product" opens a sheet overlay — no page navigation required.
 * • Pushes page content up via a spacer div so nothing is hidden behind the bar.
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Plus, Store, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface SellerMeta {
  id: string;
  slug: string;
  userId: string;
}

export function SellerBottomNav() {
  const [seller, setSeller] = useState<SellerMeta | null>(null);
  const [checked, setChecked] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const nav = useNavigate();

  // Product form state
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pImg, setPImg] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setChecked(true); return; }
      const { data: s } = await supabase
        .from("sellers")
        .select("id, slug, user_id")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (s) setSeller({ id: s.id, slug: s.slug, userId: u.user.id });
      setChecked(true);
    })();

    // Re-check on auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session) { setSeller(null); return; }
      const { data: s } = await supabase
        .from("sellers")
        .select("id, slug, user_id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setSeller(s ? { id: s.id, slug: s.slug, userId: session.user.id } : null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Hide until check is done, or if user has no seller profile
  if (!checked || !seller) return null;

  const uploadImage = async (file: File): Promise<string | null> => {
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, or GIF images are allowed");
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)");
      return null;
    }
    const extMap: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
    const ext = extMap[file.type];
    const path = `${seller.userId}/product-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("sutura")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error("Upload failed"); return null; }
    return supabase.storage.from("sutura").getPublicUrl(path).data.publicUrl;
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) { toast.error("Product name is required"); return; }
    if (!pPrice || Number(pPrice) <= 0) { toast.error("Enter a valid price"); return; }
    setAdding(true);
    let image_url: string | null = null;
    if (pImg) image_url = await uploadImage(pImg);
    const { error } = await supabase.from("products").insert({
      seller_id: seller.id,
      name: pName.trim(),
      price: Number(pPrice),
      description: pDesc.trim() || null,
      image_url,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product added! 🎉");
    setPName(""); setPPrice(""); setPDesc(""); setPImg(null);
    setSheetOpen(false);
    // If already on the store page, soft-refresh
    if (pathname === `/store/${seller.slug}`) {
      nav({ to: `/store/${seller.slug}`, replace: true });
    }
  };

  const isHome    = pathname === "/";
  const isProfile = pathname === `/store/${seller.slug}`;

  const tabBase = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors";
  const activeTab = "text-primary";
  const inactiveTab = "text-muted-foreground hover:text-foreground";

  return (
    <>
      {/* Spacer so page content isn't hidden behind nav */}
      <div className="h-20" aria-hidden />

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 flex h-16 items-stretch border-t border-border/60 bg-card/95 backdrop-blur-md shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
        role="navigation"
        aria-label="Seller navigation"
      >
        {/* Home */}
        <Link to="/" className={`${tabBase} ${isHome ? activeTab : inactiveTab}`}>
          <Home className="h-5 w-5" />
          Home
        </Link>

        {/* Add Product — prominent centre button */}
        <div className="flex flex-1 items-center justify-center">
          <button
            onClick={() => setSheetOpen(true)}
            className="relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-warm-lg transition active:scale-95 hover:bg-primary/90"
            aria-label="Add product"
          >
            <Plus className="h-7 w-7" />
          </button>
        </div>

        {/* Profile / Store */}
        <Link
          to="/store/$slug"
          params={{ slug: seller.slug }}
          className={`${tabBase} ${isProfile ? activeTab : inactiveTab}`}
        >
          <Store className="h-5 w-5" />
          My Store
        </Link>
      </nav>

      {/* Add Product Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-serif text-xl">Add New Product</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <Label>Product name *</Label>
              <Input
                required
                placeholder="e.g. Suya Plate, Ankara Gele…"
                value={pName}
                onChange={(e) => setPName(e.target.value)}
              />
            </div>
            <div>
              <Label>Price (₦) *</Label>
              <Input
                required
                type="number"
                min="1"
                placeholder="e.g. 2500"
                value={pPrice}
                onChange={(e) => setPPrice(e.target.value)}
              />
            </div>
            <div>
              <Label>Product photo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setPImg(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of your product…"
                value={pDesc}
                onChange={(e) => setPDesc(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={adding}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {adding ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding…</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" /> Add Product</>
              )}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
