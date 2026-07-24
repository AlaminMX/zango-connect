/**
 * /seller/products — seller's product management dashboard.
 * Stats, per-product edit/delete/stock toggle, click count.
 */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { PageLoader } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ProductSheet } from "@/components/ProductSheet";
import { useAuth } from "@/lib/authContext";
import { useSellerProfile } from "@/lib/sellerProfile";
import { Plus, Pencil, Trash2, MessageCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/products")({ component: SellerProducts });

interface ProductRow {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  image_urls: string[] | null;
  status: string;
  stock_status: string;
  description: string | null;
  price_updated_at: string | null;
  created_at: string;
}

function SellerProducts() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { user, isReady } = useAuth();
  const { seller, loading: sellerLoading } = useSellerProfile();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [confirmDel, setConfirmDel] = useState<ProductRow | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!user) nav({ to: "/auth", replace: true });
    else if (!sellerLoading && !seller) nav({ to: "/register", replace: true });
  }, [isReady, user, sellerLoading, seller, nav]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["seller-products", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, image_urls, status, stock_status, description, price_updated_at, created_at")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false })
        .abortSignal(AbortSignal.timeout(8000));
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
  });

  const { data: clickStats } = useQuery({
    queryKey: ["seller-click-stats", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const [{ data: all }, { data: month }] = await Promise.all([
        supabase.from("whatsapp_clicks").select("product_id").eq("seller_id", seller!.id),
        supabase.from("whatsapp_clicks").select("id").eq("seller_id", seller!.id).gte("created_at", monthAgo),
      ]);
      const perProduct = new Map<string, number>();
      (all ?? []).forEach((c: any) => { if (c.product_id) perProduct.set(c.product_id, (perProduct.get(c.product_id) ?? 0) + 1); });
      return { total: all?.length ?? 0, month: month?.length ?? 0, perProduct };
    },
  });

  const toggleStock = async (p: ProductRow) => {
    const next = p.stock_status === "sold_out" ? "available" : "sold_out";
    const { error } = await supabase.from("products").update({ stock_status: next }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next === "sold_out" ? "Marked out of stock" : "Marked in stock");
    qc.invalidateQueries({ queryKey: ["seller-products", seller?.id] });
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("products").delete().eq("id", confirmDel.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    setConfirmDel(null);
    qc.invalidateQueries({ queryKey: ["seller-products", seller?.id] });
  };

  if (!isReady || sellerLoading) return <PageLoader label="Loading…" />;
  if (!seller) return null;

  const isApproved = seller.verification_status === "approved";

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-4xl px-5 py-6">
        <BackButton fallback="/" />

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-espresso">My products</h1>
            <p className="text-xs text-muted-foreground">Kayayyakina</p>
          </div>
          <Button
            onClick={() => { if (!isApproved) { toast.info("Your store must be approved to add products."); return; } setAddOpen(true); }}
            className="min-h-[44px] rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" /> Add product
          </Button>
        </div>

        {!isApproved && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Your store is under review</p>
            <p className="mt-1 text-xs">You can add products once an admin approves your store.</p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatTile label="Products" value={products?.length ?? 0} />
          <StatTile label="WhatsApp clicks" value={clickStats?.total ?? 0} sub="all time" />
          <StatTile label="This month" value={clickStats?.month ?? 0} sub="clicks" />
        </div>

        {/* List */}
        <div className="mt-6">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading products…</p>
          ) : !products || products.length === 0 ? (
            <div className="rounded-3xl border border-border-warm bg-card p-10 text-center">
              <p className="font-display text-xl text-espresso">No products yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your first product to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border-warm overflow-hidden rounded-3xl border border-border-warm bg-card">
              {products.map((p) => {
                const clicks = clickStats?.perProduct.get(p.id) ?? 0;
                const cover = (p.image_urls && p.image_urls[0]) || p.image_url;
                const out = p.stock_status === "sold_out";
                return (
                  <li key={p.id} className="flex gap-3 p-3">
                    <Link to="/product/$id" params={{ id: p.id }} className="shrink-0">
                      <div className="h-20 w-20 overflow-hidden rounded-2xl bg-surface-warm">
                        {cover ? <img src={cover} alt={p.name} className="h-full w-full object-cover" loading="lazy" /> : null}
                      </div>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link to="/product/$id" params={{ id: p.id }} className="min-w-0">
                          <p className="line-clamp-1 font-semibold text-espresso hover:text-primary">{p.name}</p>
                        </Link>
                        {out && <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">Out of stock</span>}
                      </div>
                      <p className="mt-0.5 font-display text-sage-deep">
                        {p.price != null ? `₦${Number(p.price).toLocaleString()}` : <span className="text-sm italic text-muted-foreground">Price on request</span>}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="h-3 w-3" /> {clicks} click{clicks === 1 ? "" : "s"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(p)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => toggleStock(p)}>
                          {out ? <><Eye className="mr-1 h-3.5 w-3.5" /> Mark in stock</>
                               : <><EyeOff className="mr-1 h-3.5 w-3.5" /> Out of stock</>}
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-full text-destructive hover:bg-destructive/10" onClick={() => setConfirmDel(p)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <Footer />

      <ProductSheet
        open={addOpen} onOpenChange={setAddOpen}
        mode="add" sellerId={seller.id} sellerSlug={seller.slug}
      />
      <ProductSheet
        open={!!editing} onOpenChange={(o) => !o && setEditing(null)}
        mode="edit" sellerId={seller.id} sellerSlug={seller.slug}
        product={editing ?? undefined}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDel?.name}</strong> will be removed permanently. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border-warm bg-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl text-espresso">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
