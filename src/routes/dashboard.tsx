import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Trash2, ExternalLink, Plus } from "lucide-react";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

interface Seller {
  id: string; slug: string; business_name: string; bio: string | null;
  whatsapp_number: string; profile_photo_url: string | null; cover_photo_url: string | null;
  city: string; category: string;
}
interface Product { id: string; name: string; price: number; description: string | null; image_url: string | null; }

function Dashboard() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit fields
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  // New product
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pImg, setPImg] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/auth" }); return; }
      setUserId(u.user.id);
      const { data: s } = await supabase.from("sellers").select("*").eq("user_id", u.user.id).maybeSingle();
      if (!s) { nav({ to: "/register" }); return; }
      setSeller(s as Seller);
      setBio(s.bio ?? ""); setWhatsapp(s.whatsapp_number);
      const { data: p } = await supabase.from("products").select("*").eq("seller_id", s.id).order("created_at", { ascending: false });
      setProducts((p ?? []) as Product[]);
      setLoading(false);
    })();
  }, [nav]);

  const uploadImage = async (file: File, prefix: string): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("sutura").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("sutura").getPublicUrl(path).data.publicUrl;
  };

  const saveProfile = async () => {
    if (!seller) return;
    setSaving(true);
    const updates: Record<string, string> = { bio, whatsapp_number: whatsapp };
    if (profileFile) { const url = await uploadImage(profileFile, "profile"); if (url) updates.profile_photo_url = url; }
    if (coverFile) { const url = await uploadImage(coverFile, "cover"); if (url) updates.cover_photo_url = url; }
    const { error } = await supabase.from("sellers").update(updates).eq("id", seller.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    setSeller({ ...seller, ...updates } as Seller);
    setProfileFile(null); setCoverFile(null);
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seller) return;
    setAdding(true);
    let image_url: string | null = null;
    if (pImg) image_url = await uploadImage(pImg, "product");
    const { data, error } = await supabase.from("products").insert({
      seller_id: seller.id, name: pName, price: Number(pPrice), description: pDesc, image_url,
    }).select().single();
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product added");
    setProducts([data as Product, ...products]);
    setPName(""); setPPrice(""); setPDesc(""); setPImg(null);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setProducts(products.filter((p) => p.id !== id));
    toast.success("Deleted");
  };

  if (loading || !seller) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/store/${seller.slug}` : "";

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-2xl px-5 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl">My Dashboard</h1>
            <p className="text-sm text-muted-foreground">{seller.business_name}</p>
          </div>
          <Link to="/store/$slug" params={{ slug: seller.slug }}>
            <Button variant="outline" size="sm" className="rounded-full">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View store
            </Button>
          </Link>
        </div>

        {/* Share link */}
        <div className="mt-6 rounded-2xl border bg-card p-4 shadow-warm">
          <p className="mb-2 text-xs font-medium text-muted-foreground">YOUR STORE LINK</p>
          <div className="flex items-center gap-2 rounded-full border bg-muted px-3 py-2 text-sm">
            <span className="flex-1 truncate text-left">{shareUrl}</span>
            <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Copied"); }}>
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Profile edit */}
        <section className="mt-6 rounded-2xl border bg-card p-6 shadow-warm">
          <h2 className="mb-4 font-serif text-xl">Edit profile</h2>
          <div className="space-y-4">
            <div><Label>Bio</Label><Textarea value={bio} maxLength={150} onChange={(e) => setBio(e.target.value)} /></div>
            <div><Label>WhatsApp number</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
            <div><Label>Profile photo {seller.profile_photo_url && "(replace)"}</Label><Input type="file" accept="image/*" onChange={(e) => setProfileFile(e.target.files?.[0] ?? null)} /></div>
            <div><Label>Cover photo {seller.cover_photo_url && "(replace)"}</Label><Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} /></div>
            <Button onClick={saveProfile} disabled={saving} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </section>

        {/* Add product */}
        <section className="mt-6 rounded-2xl border bg-card p-6 shadow-warm">
          <h2 className="mb-4 font-serif text-xl">Add product</h2>
          <form onSubmit={addProduct} className="space-y-3">
            <div><Label>Name</Label><Input required value={pName} onChange={(e) => setPName(e.target.value)} /></div>
            <div><Label>Price (₦)</Label><Input required type="number" min="0" value={pPrice} onChange={(e) => setPPrice(e.target.value)} /></div>
            <div><Label>Photo</Label><Input type="file" accept="image/*" onChange={(e) => setPImg(e.target.files?.[0] ?? null)} /></div>
            <div><Label>Description</Label><Textarea value={pDesc} onChange={(e) => setPDesc(e.target.value)} /></div>
            <Button type="submit" disabled={adding} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-1 h-4 w-4" /> {adding ? "Adding…" : "Add product"}
            </Button>
          </form>
        </section>

        {/* Products list */}
        <section className="mt-6">
          <h2 className="mb-3 font-serif text-xl">My products ({products.length})</h2>
          <div className="space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-warm">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-sm text-primary">₦{Number(p.price).toLocaleString()}</p>
                </div>
                <button onClick={() => deleteProduct(p.id)} className="rounded-full p-2 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {products.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
          </div>
        </section>

        <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }} className="mt-8">
          Sign out
        </Button>
      </div>
      <Footer />
    </div>
  );
}
