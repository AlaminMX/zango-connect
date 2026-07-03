import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft, GripVertical, Plus, Trash2, Loader2, Search } from "lucide-react";
import { logFeaturedProductAction } from "@/lib/audit-log";

export const Route = createFileRoute("/admin/featured-products")({
  component: AdminFeaturedProductsPage,
});

interface FeaturedProduct {
  id: string;
  product_id: string;
  display_order: number;
  product_name: string;
  seller_name: string;
  category: string;
  image_url: string | null;
  price: number | null;
}

function AdminFeaturedProductsPage() {
  const { user, isAdmin, isReady } = useAuth();
  const [featured, setFeatured] = useState<FeaturedProduct[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const allowed = isReady && !!user && isAdmin;

  useEffect(() => {
    if (!allowed) return;
    loadFeaturedProducts();
  }, [allowed]);

  const loadFeaturedProducts = async () => {
    setLoading(true);
    try {
      const { data: featured, error: err1 } = await supabase
        .from("featured_products_admin")
        .select(`
          id, product_id, display_order,
          products!inner(name, price, image_url, sellers!inner(business_name, category))
        `)
        .order("display_order");

      if (err1) throw err1;

      const mapped = (featured || []).map((f: any) => ({
        id: f.id,
        product_id: f.product_id,
        display_order: f.display_order,
        product_name: f.products.name,
        seller_name: f.products.sellers.business_name,
        category: f.products.sellers.category,
        image_url: f.products.image_url,
        price: f.products.price,
      }));

      setFeatured(mapped);

      // Load available products (not already featured)
      const featuredIds = mapped.map((f) => f.product_id);
      const { data: products, error: err2 } = await supabase
        .from("products")
        .select("id, name, image_url, sellers!inner(business_name, category)")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100);

      if (err2) throw err2;
      const filtered = (products || [])
        .filter((p: any) => !featuredIds.includes(p.id))
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          seller_name: p.sellers.business_name,
          category: p.sellers.category,
        }));

      setAvailableProducts(filtered);
    } catch (err) {
      console.error("[featured-products] load failed:", err);
      toast.error("Failed to load featured products");
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productId: string) => {
    try {
      const newOrder = Math.max(...featured.map((f) => f.display_order), 0) + 1;
      const { error } = await supabase.from("featured_products_admin").insert({
        product_id: productId,
        display_order: newOrder,
        added_by: user!.id,
      });

      if (error) throw error;
      
      // Log audit action
      await logFeaturedProductAction(user!.id, "featured_product_added", productId);
      
      toast.success("Product added");
      await loadFeaturedProducts();
    } catch (err) {
      console.error("[featured-products] add failed:", err);
      toast.error("Failed to add product");
    }
  };

  const removeProduct = async (id: string) => {
    try {
      const product = featured.find((f) => f.id === id);
      const { error } = await supabase.from("featured_products_admin").delete().eq("id", id);
      if (error) throw error;
      
      // Log audit action
      await logFeaturedProductAction(user!.id, "featured_product_removed", product?.product_id);
      
      toast.success("Product removed");
      await loadFeaturedProducts();
    } catch (err) {
      console.error("[featured-products] remove failed:", err);
      toast.error("Failed to remove product");
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < featured.length; i++) {
        const { error } = await supabase
          .from("featured_products_admin")
          .update({ display_order: i + 1 })
          .eq("id", featured[i].id);
        if (error) throw error;
      }
      
      // Log audit action
      await logFeaturedProductAction(user!.id, "featured_products_reordered", undefined, {
        product_count: featured.length,
      });
      
      toast.success("Order saved");
    } catch (err) {
      console.error("[featured-products] save failed:", err);
      toast.error("Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (id: string) => setDraggedItem(id);

  const handleDrop = (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = featured.findIndex((f) => f.id === draggedItem);
    const targetIndex = featured.findIndex((f) => f.id === targetId);

    const newFeatured = [...featured];
    [newFeatured[draggedIndex], newFeatured[targetIndex]] = [newFeatured[targetIndex], newFeatured[draggedIndex]];
    setFeatured(newFeatured);
    setDraggedItem(null);
  };

  const filtered = availableProducts.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.seller_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to admin
        </Link>

        <h1 className="mb-2 text-3xl font-bold">Featured Products</h1>
        <p className="mb-6 text-sm text-muted-foreground">Manage products displayed on the homepage</p>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Currently Featured */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Current Featured ({featured.length})</h2>
              {featured.length > 0 && (
                <Button
                  onClick={saveOrder}
                  disabled={saving}
                  size="sm"
                  className="rounded-full"
                >
                  {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Save order
                </Button>
              )}
            </div>

            {featured.length === 0 ? (
              <p className="text-sm text-muted-foreground">No featured products yet. Add one below.</p>
            ) : (
              <div className="space-y-2">
                {featured.map((f) => (
                  <div
                    key={f.id}
                    draggable
                    onDragStart={() => handleDragStart(f.id)}
                    onDrop={() => handleDrop(f.id)}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 cursor-move hover:bg-muted/60 transition"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {f.image_url && (
                      <img src={f.image_url} alt={f.product_name} className="h-12 w-12 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{f.product_name}</p>
                      <p className="text-xs text-muted-foreground">{f.seller_name}</p>
                    </div>
                    <button
                      onClick={() => removeProduct(f.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Products */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Available Products</h2>
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
              icon={<Search className="h-4 w-4" />}
            />

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No products available</p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {filtered.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 p-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">{p.seller_name}</p>
                    </div>
                    <button
                      onClick={() => addProduct(p.id)}
                      className="p-1 text-muted-foreground hover:text-primary transition flex-shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
