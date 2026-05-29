import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Trash2, ExternalLink, Plus, Pencil, MessageCircle, TrendingUp } from "lucide-react";
import { NIGERIAN_CITIES } from "@/lib/categories";
import { validateNigerianPhone } from "@/lib/whatsapp";

const SELLER_CATEGORIES = [
  "Food & Drinks", "Fashion", "Beauty", "Home & Living", "Crafts & Art", "Accessories",
];

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

interface Seller {
  id: string; slug: string; business_name: string; bio: string | null;
  whatsapp_number: string; profile_photo_url: string | null; cover_photo_url: string | null;
  city: string; category: string;
}
interface Product {
  id: string; name: string; price: number; description: string | null;
  image_url: string | null; stock_status?: string;
}

const STOCK_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "low_stock", label: "Low stock" },
  { value: "sold_out", label: "Sold out" },
];

function Dashboard() {
  const nav = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clicks, setClicks] = useState(0);

  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pImg, setPImg] = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<Product | null>(null);
  const [eName, setEName] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eStock, setEStock] = useState("available");
  const [eImg, setEImg] = useState<File | null>(null);
  const [eSaving, setESaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/auth" }); return; }
      setUserId(u.user.id);
      const { data: s } = await supabase.from("sellers").select("*").eq("user_id", u.user.id).maybeSingle();
      if (!s) { nav({ to: "/register" }); return; }
      setSeller(s as Seller);
      setBio(s.bio ?? ""); setWhatsapp(s.whatsapp_number);
      setBusinessName(s.business_name); setCity(s.city); setCategory(s.category);
      const { data: p } = await supabase.from("products").select("*").eq("seller_id", s.id).order("created_at", { ascending: false });
      setProducts((p ?? []) as Product[]);
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { count } = await supabase
        .from("whatsapp_clicks")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", s.id)
        .gte("created_at", since);
      setClicks(count ?? 0);
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
    const phoneCheck = validateNigerianPhone(whatsapp);
    if (!phoneCheck.valid) { toast.error(phoneCheck.error); return; }
    if (!businessName.trim()) { toast.error("Business name cannot be empty."); return; }
    setSaving(true);
    const updates: {
      business_name: string; city: string; category: string;
      bio: string; whatsapp_number: string; profile_photo_url?: string; cover_photo_url?: string;
    } = { business_name: businessName.trim(), city, category, bio, whatsapp_number: whatsapp };
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

  const openEdit = (p: Product) => {
    setEditing(p);
    setEName(p.name); setEPrice(String(p.price)); setEDesc(p.description ?? "");
    setEStock(p.stock_status ?? "available"); setEImg(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setESaving(true);
    const updates: any = { name: eName, price: Number(ePrice), description: eDesc, stock_status: eStock };
    if (eImg) { const url = await uploadImage(eImg, "product"); if (url) updates.image_url = url; }
    const { error } = await supabase.from("products").update(updates).eq("id", editing.id);
    setESaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    setProducts(products.map((p) => p.id === editing.id ? { ...p, ...updates } : p));
    setEditing(null);
  };

  if (loading || !seller) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/store/${seller.slug}` : "";

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-2xl px-5 py-8">

        {/* ---------------------------------------------------------------- */}
        {/* Header — back button + title + view store                        */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex items-center gap-3">
          <BackButton fallback="/" />
          <div className="flex-1">
            <h1 className="font-serif text-3xl">My Dashboard</h1>
            <p className="text-sm text-muted-foreground">{seller.business_name}</p>
          </div>
          <Link to="/store/$slug" params={{ slug: seller.slug }}>
            <Button variant="outline" size="sm" className="rounded-full">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View store
            </Button>
          </Link>
        </div>

        {/* Analytics */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4 shadow-warm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp clicks (7d)
            </div>
            <p className="mt-1 font-serif text-3xl text-primary">{clicks}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-warm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Products live
            </div>
            <p className="mt-1 font-serif text-3xl text-primary">{products.length}</p>
          </div>
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
            <div><Label>Business name</Label><Input value={businessName} required onChange={(e) => setBusinessName(e.target.value)} /></div>
            <div>
              <Label>City</Label>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>{NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{SELLER_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Bio</Label><Textarea value={bio} maxLength={150} onChange={(e) => setBio(e.target.value)} /></div>
            <div>
              <Label>WhatsApp number</Label>
              <Input value={whatsapp} placeholder="e.g. 08012345678" onChange={(e) => setWhatsapp(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Enter a valid Nigerian number (e.g. 08012345678)</p>
            </div>
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-primary">₦{Number(p.price).toLocaleString()}</p>
                    {p.stock_status === "sold_out" && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Sold out</span>}
                    {p.stock_status === "low_stock" && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">Low stock</span>}
                  </div>
                </div>
                <button onClick={() => openEdit(p)} className="rounded-full p-2 text-foreground hover:bg-muted" aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => deleteProduct(p.id)} className="rounded-full p-2 text-destructive hover:bg-destructive/10" aria-label="Delete">
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

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={eName} onChange={(e) => setEName(e.target.value)} /></div>
            <div><Label>Price (₦)</Label><Input type="number" min="0" value={ePrice} onChange={(e) => setEPrice(e.target.value)} /></div>
            <div>
              <Label>Stock status</Label>
              <Select value={eStock} onValueChange={setEStock}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STOCK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={eDesc} onChange={(e) => setEDesc(e.target.value)} /></div>
            <div><Label>Replace photo (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setEImg(e.target.files?.[0] ?? null)} /></div>
            <Button onClick={saveEdit} disabled={eSaving} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {eSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
