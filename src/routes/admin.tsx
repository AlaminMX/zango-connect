import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminPage });

interface SellerRow {
  id: string; business_name: string; slug: string; category: string; city: string; is_verified: boolean;
}

function AdminPage() {
  const nav = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [stats, setStats] = useState({ sellers: 0, products: 0, clicks: 0 });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/auth" }); return; }
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!role) { setAllowed(false); return; }
      setAllowed(true);
      const [{ data: sl }, { count: pc }, { count: cc }] = await Promise.all([
        supabase.from("sellers").select("id, business_name, slug, category, city, is_verified").order("created_at", { ascending: false }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("whatsapp_clicks").select("id", { count: "exact", head: true }),
      ]);
      setSellers(sl ?? []);
      setStats({ sellers: sl?.length ?? 0, products: pc ?? 0, clicks: cc ?? 0 });
    })();
  }, [nav]);

  const toggleVerify = async (id: string, current: boolean) => {
    const { error } = await supabase.from("sellers").update({ is_verified: !current }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSellers((prev) => prev.map((s) => s.id === id ? { ...s, is_verified: !current } : s));
    toast.success(!current ? "Verified" : "Unverified");
  };

  if (allowed === null) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!allowed) return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="p-10 text-center">
        <h1 className="font-serif text-2xl">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">You don't have access to this page.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="font-serif text-3xl">Admin</h1>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Sellers", value: stats.sellers },
            { label: "Products", value: stats.products },
            { label: "WhatsApp clicks", value: stats.clicks },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4 shadow-warm">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-serif text-3xl text-primary">{s.value}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 mb-3 font-serif text-xl">Sellers</h2>
        <div className="space-y-2">
          {sellers.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-warm">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link to="/store/$slug" params={{ slug: s.slug }} className="truncate font-medium hover:text-primary">{s.business_name}</Link>
                  {s.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{s.category} · {s.city}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Verified</span>
                <Switch checked={s.is_verified} onCheckedChange={() => toggleVerify(s.id, s.is_verified)} />
              </div>
            </div>
          ))}
          {sellers.length === 0 && <p className="text-sm text-muted-foreground">No sellers yet.</p>}
        </div>

        <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }} className="mt-8">
          Sign out
        </Button>
      </div>
    </div>
  );
}
