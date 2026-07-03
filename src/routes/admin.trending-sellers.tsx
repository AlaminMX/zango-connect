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
import { logTrendingSellerAction } from "@/lib/audit-log";

export const Route = createFileRoute("/admin/trending-sellers")({
  component: AdminTrendingSellersPage,
});

interface TrendingSeller {
  id: string;
  seller_id: string;
  display_order: number;
  business_name: string;
  category: string;
  profile_photo_url: string | null;
}

const MAX_TRENDING_SELLERS = 12;

function AdminTrendingSellersPage() {
  const { user, isAdmin, isReady } = useAuth();
  const [trending, setTrending] = useState<TrendingSeller[]>([]);
  const [availableSellers, setAvailableSellers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const allowed = isReady && !!user && isAdmin;

  useEffect(() => {
    if (!allowed) return;
    loadTrendingSellers();
  }, [allowed]);

  const loadTrendingSellers = async () => {
    setLoading(true);
    try {
      const { data: trending, error: err1 } = await supabase
        .from("trending_sellers_admin")
        .select(`
          id, seller_id, display_order,
          sellers!inner(business_name, category, profile_photo_url)
        `)
        .order("display_order");

      if (err1) throw err1;

      const mapped = (trending || []).map((t: any) => ({
        id: t.id,
        seller_id: t.seller_id,
        display_order: t.display_order,
        business_name: t.sellers.business_name,
        category: t.sellers.category,
        profile_photo_url: t.sellers.profile_photo_url,
      }));

      setTrending(mapped);

      // Load available sellers (not already trending, verified only)
      const trendingIds = mapped.map((t) => t.seller_id);
      const { data: sellers, error: err2 } = await supabase
        .from("sellers")
        .select("id, business_name, category, profile_photo_url")
        .eq("verification_status", "approved")
        .eq("is_blocked", false)
        .order("created_at", { ascending: false })
        .limit(100);

      if (err2) throw err2;
      const filtered = (sellers || [])
        .filter((s: any) => !trendingIds.includes(s.id))
        .map((s: any) => ({
          id: s.id,
          business_name: s.business_name,
          category: s.category,
          profile_photo_url: s.profile_photo_url,
        }));

      setAvailableSellers(filtered);
    } catch (err) {
      console.error("[trending-sellers] load failed:", err);
      toast.error("Failed to load trending sellers");
    } finally {
      setLoading(false);
    }
  };

  const addSeller = async (sellerId: string) => {
    if (trending.length >= MAX_TRENDING_SELLERS) {
      toast.error(`Maximum ${MAX_TRENDING_SELLERS} trending sellers allowed`);
      return;
    }

    try {
      const newOrder = Math.max(...trending.map((t) => t.display_order), 0) + 1;
      const { error } = await supabase.from("trending_sellers_admin").insert({
        seller_id: sellerId,
        display_order: newOrder,
        added_by: user!.id,
      });

      if (error) throw error;
      
      // Log audit action
      await logTrendingSellerAction(user!.id, "trending_seller_added", sellerId);
      
      toast.success("Seller added to trending");
      await loadTrendingSellers();
    } catch (err) {
      console.error("[trending-sellers] add failed:", err);
      toast.error("Failed to add seller");
    }
  };

  const removeSeller = async (id: string) => {
    try {
      const seller = trending.find((t) => t.id === id);
      const { error } = await supabase.from("trending_sellers_admin").delete().eq("id", id);
      if (error) throw error;
      
      // Log audit action
      await logTrendingSellerAction(user!.id, "trending_seller_removed", seller?.seller_id);
      
      toast.success("Seller removed from trending");
      await loadTrendingSellers();
    } catch (err) {
      console.error("[trending-sellers] remove failed:", err);
      toast.error("Failed to remove seller");
    }
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < trending.length; i++) {
        const { error } = await supabase
          .from("trending_sellers_admin")
          .update({ display_order: i + 1 })
          .eq("id", trending[i].id);
        if (error) throw error;
      }
      
      // Log audit action
      await logTrendingSellerAction(user!.id, "trending_sellers_reordered", undefined, {
        seller_count: trending.length,
      });
      
      toast.success("Order saved");
    } catch (err) {
      console.error("[trending-sellers] save failed:", err);
      toast.error("Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (id: string) => setDraggedItem(id);

  const handleDrop = (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = trending.findIndex((t) => t.id === draggedItem);
    const targetIndex = trending.findIndex((t) => t.id === targetId);

    const newTrending = [...trending];
    [newTrending[draggedIndex], newTrending[targetIndex]] = [newTrending[targetIndex], newTrending[draggedIndex]];
    setTrending(newTrending);
    setDraggedItem(null);
  };

  const filtered = availableSellers.filter((s) =>
    s.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to admin
        </Link>

        <h1 className="mb-2 text-3xl font-bold">Trending Sellers</h1>
        <p className="mb-6 text-sm text-muted-foreground">Manage sellers featured on the homepage (max {MAX_TRENDING_SELLERS})</p>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Currently Trending */}
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Current Trending ({trending.length}/{MAX_TRENDING_SELLERS})</h2>
              {trending.length > 0 && (
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

            {trending.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trending sellers yet. Add one below.</p>
            ) : (
              <div className="space-y-2">
                {trending.map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => handleDragStart(t.id)}
                    onDrop={() => handleDrop(t.id)}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3 cursor-move hover:bg-muted/60 transition"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    {t.profile_photo_url && (
                      <img src={t.profile_photo_url} alt={t.business_name} className="h-10 w-10 rounded-full object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.business_name}</p>
                      <p className="text-xs text-muted-foreground">{t.category}</p>
                    </div>
                    <button
                      onClick={() => removeSeller(t.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Sellers */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold">Available Sellers</h2>
            <Input
              placeholder="Search sellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
              icon={<Search className="h-4 w-4" />}
            />

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sellers available</p>
            ) : (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {filtered.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 p-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {s.profile_photo_url && (
                        <img src={s.profile_photo_url} alt={s.business_name} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-xs truncate">{s.business_name}</p>
                        <p className="text-[11px] text-muted-foreground">{s.category}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => addSeller(s.id)}
                      disabled={trending.length >= MAX_TRENDING_SELLERS}
                      className="p-1 text-muted-foreground hover:text-primary transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
