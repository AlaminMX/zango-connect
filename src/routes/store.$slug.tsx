/**
 * store.$slug.tsx
 * Public seller profile / store page.
 *
 * Changes:
 *  1. Sticky WhatsApp "Order on WhatsApp" button REMOVED.
 *  2. When the logged-in user IS the store owner, an "Edit Store" mode appears.
 *     Edit mode lets sellers update their profile and products inline —
 *     "what customers see is what sellers manage."
 *  3. Owner analytics (click count, product count) visible only to owner.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { BackButton } from "@/components/BackButton";
import { VerificationBanner, ApprovedBanner } from "@/components/VerificationBanner";
import { SectionLoader } from "@/components/LoadingSpinner";
import {
  BadgeCheck, MapPin, Share2, Heart, Pencil, X, Check,
  Plus, Trash2, TrendingUp, MessageCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NIGERIAN_CITIES } from "@/lib/categories";
import { validateNigerianPhone } from "@/lib/whatsapp";

export const Route = createFileRoute("/store/$slug")({ component: StorePage });

const STOCK_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "low_stock",  label: "Low stock" },
  { value: "sold_out",   label: "Sold out" },
];

function StorePage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();

  const [userId, setUserId]     = useState<string | null>(null);
  const [mySellerId, setMySellerId] = useState<string | null>(null);
  const [isOwner, setIsOwner]   = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Edit fields
  const [eBusiness, setEBusiness] = useState("");
  const [eCity, setECity]         = useState("");
  const [eCategory, setECategory] = useState("");
  const [eBio, setEBio]           = useState("");
  const [eWhatsapp, setEWhatsapp] = useState("");
  const [eProfileFile, setEProfileFile] = useState<File | null>(null);
  const [eCoverFile, setECoverFile]   = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Add product
  const [pName, setPName]   = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pDesc, setPDesc]   = useState("");
  const [pImg, setPImg]     = useState<File | null>(null);
  const [adding, setAdding] = useState(false);

  // Edit product dialog
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [ePName, setEPName]   = useState("");
  const [ePPrice, setEPPrice] = useState("");
  const [ePDesc, setEPDesc]   = useState("");
  const [ePStock, setEPStock] = useState("available");
  const [ePImg, setEPImg]     = useState<File | null>(null);
  const [ePSaving, setEPSaving] = useState(false);

  const [clicks, setClicks] = useState(0);
  const [categories, setCategories] = useState<{ name: string }[]>([]);

  useEffect(() => {
    supabase.from("categories").select("name").order("sort_order").then(({ data }) => setCategories(data ?? []));
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const { data: s } = await supabase.from("sellers").select("id").eq("user_id", data.user.id).maybeSingle();
      if (s) setMySellerId(s.id);
    });
  }, []);

  const { data: seller, isLoading } = useQuery({
    queryKey: ["seller", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("sellers").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products, refetch: refetchProducts } = useQuery({
    queryKey: ["products", seller?.id],
    enabled: !!seller,
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("seller_id", seller!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: vouchCount } = useQuery({
    queryKey: ["vouches", seller?.id],
    enabled: !!seller,
    queryFn: async () => {
      const { count } = await supabase.from("vouches").select("id", { count: "exact", head: true }).eq("vouched_seller_id", seller!.id);
      return count ?? 0;
    },
  });

  // Determine ownership
  useEffect(() => {
    if (seller && userId) {
      const owned = seller.user_id === userId;
      setIsOwner(owned);
      if (owned) {
        setEBusiness(seller.business_name);
        setECity(seller.city);
        setECategory(seller.category);
        setEBio(seller.bio ?? "");
        setEWhatsapp(seller.whatsapp_number);
        // Fetch analytics
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        supabase.from("whatsapp_clicks").select("id", { count: "exact", head: true })
          .eq("seller_id", seller.id).gte("created_at", since)
          .then(({ count }) => setClicks(count ?? 0));
      }
    }
  }, [seller, userId]);

  if (isLoading) return <SectionLoader label="Loading store…" />;
  if (!seller) return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="p-10 text-center">
        <p className="font-serif text-2xl">Store not found</p>
        <Link to="/" className="mt-3 inline-block text-sm text-primary underline">Go home</Link>
      </div>
    </div>
  );

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/store/${seller.slug}` : "";

  const handleShare = async () => {
    try { await navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); } catch {}
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my store on Sutura Market 🛍️ ${shareUrl}`)}`, "_blank");
  };

  const handleVouch = async () => {
    if (!userId || !mySellerId) { toast.error("Sign in as a seller to vouch"); return; }
    if (mySellerId === seller.id) { toast.error("You can't vouch for yourself"); return; }
    const { error } = await supabase.from("vouches").insert({ voucher_seller_id: mySellerId, vouched_seller_id: seller.id });
    if (error) toast.error(error.message.includes("duplicate") ? "Already vouched" : error.message);
    else toast.success("Vouched! Thank you 💛");
  };

  const uploadImage = async (file: File, prefix: string): Promise<string | null> => {
    if (!userId) return null;
    const ext = file.name.split(".").pop();
    const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("sutura").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("sutura").getPublicUrl(path).data.publicUrl;
  };

  const saveProfile = async () => {
    if (!eBusiness.trim()) { toast.error("Business name cannot be empty"); return; }
    const phoneCheck = validateNigerianPhone(eWhatsapp);
    if (!phoneCheck.valid) { toast.error(phoneCheck.error); return; }
    setSaving(true);
    const updates: any = { business_name: eBusiness.trim(), city: eCity, category: eCategory, bio: eBio, whatsapp_number: eWhatsapp };
    if (eProfileFile) { const url = await uploadImage(eProfileFile, "profile"); if (url) updates.profile_photo_url = url; }
    if (eCoverFile)   { const url = await uploadImage(eCoverFile,   "cover");   if (url) updates.cover_photo_url   = url; }
    const { error } = await supabase.from("sellers").update(updates).eq("id", seller.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated!");
    qc.invalidateQueries({ queryKey: ["seller", slug] });
    setEProfileFile(null); setECoverFile(null);
    setEditMode(false);
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) { toast.error("Product name is required"); return; }
    if (!pPrice || Number(pPrice) <= 0) { toast.error("Enter a valid price"); return; }
    setAdding(true);
    let image_url: string | null = null;
    if (pImg) image_url = await uploadImage(pImg, "product");
    const { error } = await supabase.from("products").insert({
      seller_id: seller.id, name: pName.trim(), price: Number(pPrice), description: pDesc || null, image_url,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product added!");
    setPName(""); setPPrice(""); setPDesc(""); setPImg(null);
    refetchProducts();
  };

  const openEditProduct = (p: any) => {
    setEditingProduct(p); setEPName(p.name); setEPPrice(String(p.price));
    setEPDesc(p.description ?? ""); setEPStock(p.stock_status ?? "available"); setEPImg(null);
  };

  const saveEditProduct = async () => {
    if (!editingProduct) return;
    setEPSaving(true);
    const updates: any = { name: ePName, price: Number(ePPrice), description: ePDesc, stock_status: ePStock };
    if (ePImg) { const url = await uploadImage(ePImg, "product"); if (url) updates.image_url = url; }
    const { error } = await supabase.from("products").update(updates).eq("id", editingProduct.id);
    setEPSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product updated!");
    setEditingProduct(null);
    refetchProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    refetchProducts();
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <TopBar />

      {/* Edit mode banner */}
      {isOwner && editMode && (
        <div className="sticky top-16 z-30 flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <span className="flex items-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> Edit Mode — customers can't see this bar</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full h-7 text-xs" onClick={() => setEditMode(false)}>
              <X className="mr-1 h-3 w-3" /> Cancel
            </Button>
            <Button size="sm" className="rounded-full h-7 text-xs bg-primary text-primary-foreground" onClick={saveProfile} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Cover banner */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-secondary via-rose to-primary/30 sm:h-72">
        {seller.cover_photo_url && (
          <img src={seller.cover_photo_url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-background" />
        <div className="absolute left-4 top-4 z-10">
          <BackButton fallback="/" />
        </div>
        {isOwner && editMode && (
          <label className="absolute right-4 top-4 z-10 flex cursor-pointer items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow backdrop-blur">
            <Pencil className="h-3 w-3" /> Change cover
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => setECoverFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-5">
        {/* Verification banner — owner only */}
        {isOwner && seller.verification_status && seller.verification_status !== "approved" && (
          <div className="pt-4">
            <VerificationBanner status={seller.verification_status as any} reason={seller.rejection_reason} />
          </div>
        )}
        {isOwner && seller.verification_status === "approved" && (
          <div className="pt-4"><ApprovedBanner /></div>
        )}

        {/* Profile picture */}
        <div className="-mt-14 flex items-end gap-4">
          <div className="relative z-10 h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-background bg-secondary shadow-warm-lg ring-2 ring-primary/15 transition-shadow duration-200">
            {seller.profile_photo_url ? (
              <img src={seller.profile_photo_url} alt={seller.business_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-rose/40 font-serif text-4xl text-primary">
                {seller.business_name.charAt(0)}
              </div>
            )}
            {isOwner && editMode && (
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition">
                <Pencil className="h-5 w-5 text-white" />
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => setEProfileFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>
        </div>

        {/* Header info */}
        <div className="mt-4">
          {editMode && isOwner ? (
            <div className="space-y-3 rounded-2xl border border-primary/20 bg-card p-4">
              <h2 className="font-serif text-lg text-primary">Edit Profile</h2>
              <div><Label>Business name</Label><Input value={eBusiness} onChange={(e) => setEBusiness(e.target.value)} /></div>
              <div>
                <Label>City</Label>
                <Select value={eCity} onValueChange={setECity}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NIGERIAN_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={eCategory} onValueChange={setECategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Bio (max 150 chars)</Label><Textarea maxLength={150} value={eBio} onChange={(e) => setEBio(e.target.value)} /></div>
              <div>
                <Label>WhatsApp number</Label>
                <Input value={eWhatsapp} onChange={(e) => setEWhatsapp(e.target.value)} />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{seller.business_name}</h1>
                {seller.is_verified && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <BadgeCheck className="mt-1.5 h-6 w-6 text-primary" />
                      </TooltipTrigger>
                      <TooltipContent>Vouched for by {vouchCount ?? 2}+ sellers in this community</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">{seller.category}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />{seller.city}
                </span>
              </div>
              {seller.bio && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{seller.bio}</p>}
            </>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex gap-2">
            {isOwner ? (
              <Button
                onClick={() => setEditMode(!editMode)}
                variant={editMode ? "outline" : "default"}
                className="flex-1 rounded-full"
              >
                {editMode ? <><X className="mr-1.5 h-4 w-4" /> Exit edit mode</> : <><Pencil className="mr-1.5 h-4 w-4" /> Edit store</>}
              </Button>
            ) : (
              <>
                <Button onClick={handleShare} variant="outline" className="flex-1 rounded-full">
                  <Share2 className="mr-1.5 h-4 w-4" /> Share store
                </Button>
                {userId && mySellerId && mySellerId !== seller.id && (
                  <Button onClick={handleVouch} variant="outline" className="rounded-full">
                    <Heart className="mr-1.5 h-4 w-4" /> Vouch
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Owner analytics */}
          {isOwner && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-3 shadow-warm">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp clicks (7d)
                </div>
                <p className="mt-1 font-serif text-2xl text-primary">{clicks}</p>
              </div>
              <div className="rounded-xl border bg-card p-3 shadow-warm">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Products live
                </div>
                <p className="mt-1 font-serif text-2xl text-primary">{products?.length ?? 0}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Add product form (owner + edit mode) ── */}
        {isOwner && editMode && (
          <section className="mt-8 rounded-2xl border border-primary/20 bg-card p-5 shadow-warm">
            <h2 className="mb-4 font-serif text-xl text-primary">Add New Product</h2>
            <form onSubmit={addProduct} className="space-y-3">
              <div><Label>Product name *</Label><Input required placeholder="e.g. Suya Plate" value={pName} onChange={(e) => setPName(e.target.value)} /></div>
              <div><Label>Price (₦) *</Label><Input required type="number" min="1" placeholder="e.g. 2500" value={pPrice} onChange={(e) => setPPrice(e.target.value)} /></div>
              <div><Label>Photo</Label><Input type="file" accept="image/*" onChange={(e) => setPImg(e.target.files?.[0] ?? null)} /></div>
              <div><Label>Description</Label><Textarea placeholder="Short product description…" value={pDesc} onChange={(e) => setPDesc(e.target.value)} /></div>
              <Button type="submit" disabled={adding} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                {adding ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Adding…</> : <><Plus className="mr-1.5 h-4 w-4" /> Add Product</>}
              </Button>
            </form>
          </section>
        )}

        {/* ── Products section ── */}
        <div className="mt-10 mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl">Products</h2>
          {products && products.length > 0 && (
            <span className="text-xs text-muted-foreground">{products.length} items</span>
          )}
        </div>

        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <div key={p.id} className="relative">
                <ProductCard
                  id={p.id}
                  name={p.name}
                  price={Number(p.price)}
                  image_url={p.image_url}
                  stock_status={(p as any).stock_status}
                  seller_id={seller.id}
                  whatsapp_number={seller.whatsapp_number}
                />
                {/* Edit/delete overlay for owner in edit mode */}
                {isOwner && editMode && (
                  <div className="absolute inset-0 flex items-start justify-end gap-1 p-2 pointer-events-none">
                    <button
                      onClick={() => openEditProduct(p)}
                      className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur hover:bg-muted"
                      aria-label="Edit product"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-background/90 shadow backdrop-blur text-destructive hover:bg-destructive/10"
                      aria-label="Delete product"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {isOwner ? "No products yet. Add your first product above." : "No products yet."}
          </div>
        )}
      </div>

      <Footer />

      {/* ── Edit product dialog ── */}
      <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={ePName} onChange={(e) => setEPName(e.target.value)} /></div>
            <div><Label>Price (₦)</Label><Input type="number" min="0" value={ePPrice} onChange={(e) => setEPPrice(e.target.value)} /></div>
            <div>
              <Label>Stock status</Label>
              <Select value={ePStock} onValueChange={setEPStock}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STOCK_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={ePDesc} onChange={(e) => setEPDesc(e.target.value)} /></div>
            <div><Label>Replace photo (optional)</Label><Input type="file" accept="image/*" onChange={(e) => setEPImg(e.target.files?.[0] ?? null)} /></div>
            <Button onClick={saveEditProduct} disabled={ePSaving} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {ePSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
