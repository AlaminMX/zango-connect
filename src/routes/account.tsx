/**
 * account.tsx — Buyer account page with profile, wishlist, recently viewed.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoader, ProductSkeleton } from "@/components/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Heart, Clock, LogOut } from "lucide-react";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/auth" }); return; }
      // Sellers use the store dashboard
      const { data: seller } = await supabase.from("sellers").select("slug").eq("user_id", u.user.id).maybeSingle();
      if (seller) { nav({ to: "/store/$slug", params: { slug: seller.slug }, replace: true }); return; }
      setUserId(u.user.id);
      setReady(true);
    })();
  }, [nav]);

  // Profile
  const [name, setName] = useState("");
  const [cityId, setCityId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", userId!).maybeSingle();
      return data;
    },
  });

  const { data: cities } = useQuery({
    queryKey: ["cities-active"],
    queryFn: async () => {
      const { data } = await supabase.from("cities_of_business").select("id, name, state")
        .eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (profile) {
      setName(profile.display_name ?? "");
      setCityId(profile.preferred_city_id ?? "");
    }
  }, [profile]);

  const saveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      user_id: userId, display_name: name || null, preferred_city_id: cityId || null,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    qc.invalidateQueries({ queryKey: ["profile", userId] });
  };

  const { data: wishlist, isLoading: wlLoading } = useQuery({
    queryKey: ["wishlist", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id, created_at, products(id, name, price, image_url, stock_status, seller_id, sellers(business_name, city, slug, whatsapp_number))")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((r: any) => r.products);
    },
  });

  const { data: recent, isLoading: rvLoading } = useQuery({
    queryKey: ["recently-viewed", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recently_viewed")
        .select("product_id, viewed_at, products(id, name, price, image_url, stock_status, seller_id, sellers(business_name, city, slug, whatsapp_number))")
        .eq("user_id", userId!)
        .order("viewed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).filter((r: any) => r.products);
    },
  });

  const signOut = async () => { await supabase.auth.signOut(); nav({ to: "/" }); };

  if (!ready) return <PageLoader label="Loading your account…" />;

  const renderGrid = (items: any[] | undefined, loading: boolean, emptyText: string) => {
    if (loading) {
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      );
    }
    if (!items || items.length === 0) {
      return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
    }
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it: any) => {
          const p = it.products; const s = p.sellers;
          return (
            <ProductCard
              key={p.id}
              id={p.id} name={p.name} price={Number(p.price)}
              image_url={p.image_url} stock_status={p.stock_status}
              seller_id={p.seller_id}
              seller_name={s?.business_name} seller_city={s?.city}
              seller_slug={s?.slug} whatsapp_number={s?.whatsapp_number ?? ""}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="font-serif text-3xl">Your Account</h1>

        <Tabs defaultValue="profile" className="mt-6">
          <TabsList>
            <TabsTrigger value="profile"><User className="mr-1.5 h-4 w-4" /> Profile</TabsTrigger>
            <TabsTrigger value="wishlist"><Heart className="mr-1.5 h-4 w-4" /> Wishlist</TabsTrigger>
            <TabsTrigger value="recent"><Clock className="mr-1.5 h-4 w-4" /> Recently viewed</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6 space-y-4 max-w-lg">
            <div>
              <Label>Display name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label>Preferred marketplace city</Label>
              <Select value={cityId} onValueChange={setCityId}>
                <SelectTrigger><SelectValue placeholder="Choose a city" /></SelectTrigger>
                <SelectContent>
                  {(cities ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">We'll show you products and sellers from this city first.</p>
            </div>
            <Button onClick={saveProfile} disabled={saving} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? "Saving…" : "Save changes"}
            </Button>

            <div className="pt-8 border-t">
              <Button variant="ghost" onClick={signOut} className="text-destructive">
                <LogOut className="mr-1.5 h-4 w-4" /> Sign out
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="wishlist" className="mt-6">
            {renderGrid(wishlist, wlLoading, "No saved items yet. Tap the heart on any product to save it.")}
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            {renderGrid(recent, rvLoading, "Nothing viewed yet. Browse products to populate this list.")}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
