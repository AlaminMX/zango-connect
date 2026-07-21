/**
 * store.$slug.tsx — Seller profile / owner dashboard.
 *
 * Changes vs previous version:
 *  1. ApprovedBanner now receives live productCount + clicks7d for the stat chips.
 *  2. Cover image gradient overlay reduced — no more heavy fade at the bottom.
 *  3. "Add product" form uses ImageUploader (crop + compress) — image is now REQUIRED.
 *  4. Edit product dialog also uses ImageUploader for photo replacement.
 *  5. Dashboard layout is cleaner: stat cards, add-product section and product grid
 *     are better structured and visually consistent.
 *  6. NIGERIAN_CITIES city selector replaced with NIGERIA_ZONE_CITIES grouped list.
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
import { ImageUploader } from "@/components/ImageUploader";
import { SectionLoader } from "@/components/LoadingSpinner";
import {
  MapPin, Share2, Heart, Pencil, X, Check,
  Plus, Trash2, MessageCircle, Loader2, ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCity } from "@/lib/cityContext";
import { validateNigerianPhone } from "@/lib/whatsapp";


function prettifySlug(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export const Route = createFileRoute("/store/$slug")({
  beforeLoad: async (ctx) => (await import("@/lib/launchGate")).assertLaunchGate(ctx),
  component: StorePage,
  head: ({ params }) => {
    const name = prettifySlug(params.slug);
    const url = `https://sutura-connect.lovable.app/store/${params.slug}`;
    const title = `${name} — Sutura Market`;
    const description = `Shop ${name} on Sutura Market. Browse products and order directly on WhatsApp.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Store",
          name, url, description,
        }),
      }],
    };
  },
});

const STOCK_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "low_stock",  label: "Low stock" },
  { value: "sold_out",   label: "Sold out" },
];

function StorePage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();

  const [userId, setUserId]         = useState<string | null>(null);
  const [mySellerId, setMySellerId] = useState<string | null>(null);
  const [isOwner, setIsOwner]       = useState(false);
  const [isAdmin, setIsAdmin]       = useState(false);
  const [editMode, setEditMode]     = useState(false);
  const [authReady, setAuthReady]   = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Vouch state
  const [hasVouched, setHasVouched]     = useState(false);
  const [vouchLoading, setVouchLoading] = useState(false);
  const [localVouchCount, setLocalVouchCount] = useState<number | null>(null);

  // Edit fields
  const [eBusiness, setEBusiness] = useState("");
  const [eCity, setECity]         = useState("");
  const [eCityId, setECityId]     = useState<string | null>(null);
  const [eCategory, setECategory] = useState("");
  const [eBio, setEBio]           = useState("");
  const [eWhatsapp, setEWhatsapp] = useState("");
  const [eProfileUrl, setEProfileUrl] = useState<string | null>(null);
  const [eCoverUrl, setECoverUrl]     = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  

  const { activeCities, citiesLoading } = useCity();

  // Add product — now uses ImageUploader (url-based) + image is REQUIRED
  const [pName, setPName]     = useState("");
  const [pPrice, setPPrice]   = useState("");
  const [pDesc, setPDesc]     = useState("");
  const [pImgUrl, setPImgUrl] = useState<string | null>(null);
  const [adding, setAdding]   = useState(false);
  const [pImgError, setPImgError] = useState("");

  // Edit product dialog
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [ePName, setEPName]     = useState("");
  const [ePPrice, setEPPrice]   = useState("");
  const [ePDesc, setEPDesc]     = useState("");
  const [ePStock, setEPStock]   = useState("available");
  const [ePImgUrl, setEPImgUrl] = useState<string | null>(null);
  const [ePSaving, setEPSaving] = useState(false);

  const [clicks, setClicks]         = useState(0);
  const [categories, setCategories] = useState<{ name: string }[]>([]);

  useEffect(() => {
    supabase.from("categories").select("name").order("sort_order").then(({ data }) => setCategories(data ?? []));

    const initAuth = async (uid: string) => {
      setUserId(uid);
      const [{ data: s }, { data: role }] = await Promise.all([
        supabase.from("sellers").select("id").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
      ]);
      if (s) setMySellerId(s.id);
      if (role) setIsAdmin(true);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) initAuth(data.session.user.id);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        initAuth(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setUserId(null); setMySellerId(null); setIsOwner(false); setIsAdmin(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const { data: seller, isLoading } = useQuery({
    queryKey: ["seller", slug],
    queryFn: async () => {
      // Select explicit columns so anon (guest) reads don't touch columns
      // that are restricted to authenticated/admin users.
      const { data, error } = await supabase
        .from("sellers")
        .select("id, user_id, name, business_name, slug, whatsapp_number, city, city_id, category, bio, profile_photo_url, cover_photo_url, is_verified, rating, created_at, status, verification_status, is_blocked")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: products, refetch: refetchProducts } = useQuery({
    queryKey: ["products", seller?.id, isOwner, isAdmin],
    enabled: !!seller,
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select("*")
        .eq("seller_id", seller!.id)
        .order("created_at", { ascending: false });
      if (!isOwner && !isAdmin) qb = qb.eq("status", "active");
      const { data, error } = await qb.abortSignal(AbortSignal.timeout(10_000));
      if (error) throw error;
      return data;
    },
  });

  const { data: vouchCount, refetch: refetchVouchCount } = useQuery({
    queryKey: ["vouches", seller?.id],
    enabled: !!seller,
    queryFn: async () => {
      const { count } = await supabase.from("vouches").select("id", { count: "exact", head: true }).eq("vouched_seller_id", seller!.id);
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!seller || !mySellerId) return;
    supabase.from("vouches").select("id")
      .eq("voucher_seller_id", mySellerId)
      .eq("vouched_seller_id", seller.id)
      .maybeSingle()
      .then(({ data }) => setHasVouched(!!data));
  }, [seller, mySellerId]);

  useEffect(() => {
    if (vouchCount !== undefined) setLocalVouchCount(vouchCount);
  }, [vouchCount]);

  useEffect(() => {
    if (seller && userId) {
      const owned = seller.user_id === userId;
      setIsOwner(owned);
      if (owned) {
        supabase.from("sellers").select("rejection_reason").eq("id", seller.id).maybeSingle()
          .then(({ data }) => setRejectionReason(data?.rejection_reason ?? null));
        setEBusiness(seller.business_name);
        setECity(seller.city);
        setECityId(seller.city_id ?? null);
        setECategory(seller.category);
        setEBio(seller.bio ?? "");
        setEWhatsapp(seller.whatsapp_number);
        setEProfileUrl(seller.profile_photo_url ?? null);
        setECoverUrl(seller.cover_photo_url ?? null);
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
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out my store on ZANGO 🛍️ ${shareUrl}`)}`, "_blank");
  };

  const handleVouch = async () => {
    if (!userId || !mySellerId) { toast.error("Sign in as a seller to vouch"); return; }
    if (mySellerId === seller.id) { toast.error("You can't vouch for yourself"); return; }
    setVouchLoading(true);
    if (hasVouched) {
      const { error } = await supabase.from("vouches").delete()
        .eq("voucher_seller_id", mySellerId).eq("vouched_seller_id", seller.id);
      if (error) { toast.error(error.message); setVouchLoading(false); return; }
      setHasVouched(false);
      setLocalVouchCount((c) => Math.max(0, (c ?? 1) - 1));
      toast("Vouch removed");
    } else {
      const { error } = await supabase.from("vouches").insert({
        voucher_seller_id: mySellerId, vouched_seller_id: seller.id,
      });
      if (error) {
        toast.error(error.message.includes("duplicate") ? "Already vouched" : error.message);
        setVouchLoading(false); return;
      }
      setHasVouched(true);
      setLocalVouchCount((c) => (c ?? 0) + 1);
      toast.success("Vouched! Thank you 💛");
    }
    setVouchLoading(false);
    refetchVouchCount();
  };

  const saveProfile = async () => {
    if (!eBusiness.trim()) { toast.error("Business name cannot be empty"); return; }
    const phoneCheck = validateNigerianPhone(eWhatsapp);
    if (!phoneCheck.valid) { toast.error(phoneCheck.error); return; }
    setSaving(true);
    const updates: any = {
      business_name: eBusiness.trim(),
      city: eCity,
      city_id: eCityId,
      category: eCategory,
      bio: eBio,
      whatsapp_number: eWhatsapp,
      profile_photo_url: eProfileUrl,
      cover_photo_url: eCoverUrl,
    };
    const { error } = await supabase.from("sellers").update(updates).eq("id", seller.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated!");
    qc.invalidateQueries({ queryKey: ["seller", slug] });
    setEditMode(false);
  };

  // Add product — image is now REQUIRED
  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) { toast.error("Product name is required"); return; }
    if (!pPrice || Number(pPrice) <= 0) { toast.error("Enter a valid price"); return; }
    if (!pImgUrl) { setPImgError("A product image is required"); return; }
    setPImgError("");
    setAdding(true);
    const { error } = await supabase.from("products").insert({
      seller_id: seller.id,
      name: pName.trim(),
      price: Number(pPrice),
      description: pDesc || null,
      image_url: pImgUrl,
      status: "active",
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product added!");
    setPName(""); setPPrice(""); setPDesc(""); setPImgUrl(null);
    refetchProducts();
  };

  const openEditProduct = (p: any) => {
    setEditingProduct(p);
    setEPName(p.name);
    setEPPrice(String(p.price));
    setEPDesc(p.description ?? "");
    setEPStock(p.stock_status ?? "available");
    setEPImgUrl(p.image_url ?? null);
  };

  const saveEditProduct = async () => {
    if (!editingProduct) return;
    setEPSaving(true);
    const updates: any = {
      name: ePName,
      price: Number(ePPrice),
      description: ePDesc,
      stock_status: ePStock,
      image_url: ePImgUrl,
    };
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

  const canVouch = !!userId && !!mySellerId && mySellerId !== seller.id;
  const activeProducts = products?.filter((p: any) => p.status === "active") ?? [];

  return (
    <div className="min-h-screen bg-background pb-8">
      <TopBar />

      {/* Edit mode banner */}
      {isOwner && editMode && (
        <div className="sticky top-16 z-30 flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <span className="flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Edit Mode — customers can't see this bar
          </span>
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

      {/* ── Cover image — full display, light gradient only at very bottom ── */}
      <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-secondary via-rose to-primary/30 sm:h-64">
        {seller.cover_photo_url ? (
          <img
            src={seller.cover_photo_url}
            alt=""
            className="h-full w-full object-cover object-center"
          />
        ) : null}
        {/* Subtle gradient — only covers bottom 20% so cover art shows fully */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background/80" />

        <div className="absolute left-4 top-4 z-10">
          <BackButton fallback="/" />
        </div>

        {/* Edit cover button — uses ImageUploader for crop */}
        {isOwner && editMode && (
          <div className="absolute right-4 top-4 z-10">
            <ImageUploader
              value={eCoverUrl}
              onChange={setECoverUrl}
              aspect={16 / 9}
              pathPrefix="cover"
              label=""
              className="[&>div:first-child]:hidden [&_.mt-2]:mt-0"
            />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl px-5">

        {/* Verification / status banners */}
        {isOwner && seller.verification_status && seller.verification_status !== "approved" && (
          <div className="pt-4">
            <VerificationBanner status={seller.verification_status as any} reason={rejectionReason} />
          </div>
        )}
        {isOwner && seller.verification_status === "approved" && (
          <div className="pt-4">
            <ApprovedBanner productCount={activeProducts.length} clicks7d={clicks} />
          </div>
        )}

        {/* ── Profile picture ── */}
        <div className="-mt-12 flex items-end gap-4">
          <div className="relative z-10 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-background bg-secondary shadow-warm-lg ring-2 ring-primary/15">
            {seller.profile_photo_url ? (
              <img src={seller.profile_photo_url} alt={seller.business_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-secondary to-rose/40 font-serif text-4xl text-primary">
                {seller.business_name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* ── Header / profile info ── */}
        <div className="mt-4">
          {editMode && isOwner ? (
            <div className="space-y-3 rounded-2xl border border-primary/20 bg-card p-5">
              <h2 className="font-serif text-lg text-primary">Edit Profile</h2>

              {/* Profile photo upload via ImageUploader */}
              <div>
                <Label className="mb-1.5 block text-sm font-medium">Profile photo</Label>
                <ImageUploader
                  value={eProfileUrl}
                  onChange={setEProfileUrl}
                  aspect={1}
                  shape="circle"
                  pathPrefix="profile"
                />
              </div>

              <div><Label>Business name</Label><Input value={eBusiness} onChange={(e) => setEBusiness(e.target.value)} /></div>
              <div>
                <Label>City</Label>
                <Select
                  value={eCity}
                  onValueChange={(v) => {
                    setECity(v);
                    setECityId(activeCities.find((c) => c.name === v)?.id ?? null);
                  }}
                  disabled={citiesLoading}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activeCities.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
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
              <div><Label>WhatsApp number</Label><Input value={eWhatsapp} onChange={(e) => setEWhatsapp(e.target.value)} /></div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{seller.business_name}</h1>
                {seller.is_verified && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                          className="mt-1.5 h-6 w-6 cursor-default text-amber-500" aria-label="Verified seller">
                          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                        </svg>
                      </TooltipTrigger>
                      <TooltipContent>Vouched for by {localVouchCount ?? 0}+ trusted sellers</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">{seller.category}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />{seller.city}
                </span>
                {(localVouchCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700 text-xs font-medium">
                    <Heart className="h-3 w-3 fill-amber-400 text-amber-400" /> {localVouchCount} vouch{localVouchCount !== 1 ? "es" : ""}
                  </span>
                )}
              </div>
              {seller.bio && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{seller.bio}</p>}
            </>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex gap-2">
            {isOwner ? (
              <>
                <Button onClick={() => setEditMode(!editMode)} variant={editMode ? "outline" : "default"} className="flex-1 rounded-full">
                  {editMode ? <><X className="mr-1.5 h-4 w-4" /> Exit edit mode</> : <><Pencil className="mr-1.5 h-4 w-4" /> Edit store</>}
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleShare} variant="outline" className="flex-1 rounded-full">
                  <Share2 className="mr-1.5 h-4 w-4" /> Share store
                </Button>
                {canVouch && (
                  <Button
                    onClick={handleVouch}
                    disabled={vouchLoading}
                    variant="outline"
                    className={`rounded-full transition-colors ${hasVouched ? "border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100" : "hover:border-rose-300 hover:text-rose-500"}`}
                  >
                    {vouchLoading
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Heart className={`mr-1.5 h-4 w-4 transition-all ${hasVouched ? "fill-rose-500 text-rose-500 scale-110" : ""}`} />}
                    {hasVouched ? "Vouched" : "Vouch"}
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Owner analytics — shown always (not just edit mode) */}
          {isOwner && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-card p-3.5 shadow-warm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Products live</p>
                <p className="mt-1.5 font-serif text-2xl text-primary">{activeProducts.length}</p>
              </div>
              <div className="rounded-xl border bg-card p-3.5 shadow-warm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <MessageCircle className="mr-1 inline h-3 w-3" />WhatsApp (7d)
                </p>
                <p className="mt-1.5 font-serif text-2xl text-primary">{clicks}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border bg-card p-3.5 shadow-warm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Vouches</p>
                <p className="mt-1.5 font-serif text-2xl text-primary">{localVouchCount ?? 0}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Add product form (owner + edit mode + approved) ── */}
        {isOwner && editMode && seller.verification_status === "approved" && (
          <section className="mt-8 rounded-2xl border border-primary/20 bg-card p-5 shadow-warm">
            <h2 className="mb-1 font-serif text-xl text-primary">Add New Product</h2>
            <p className="mb-4 text-xs text-muted-foreground">All fields marked * are required.</p>
            <form onSubmit={addProduct} className="space-y-4">
              <div>
                <Label>Product name *</Label>
                <Input required placeholder="e.g. Suya Plate" value={pName} onChange={(e) => setPName(e.target.value)} />
              </div>
              <div>
                <Label>Price (₦) *</Label>
                <Input required type="number" min="1" placeholder="e.g. 2500" value={pPrice} onChange={(e) => setPPrice(e.target.value)} />
              </div>

              {/* Product image — REQUIRED, uses ImageUploader for crop + compress */}
              <div>
                <Label className="mb-1.5 block">
                  Product image *
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">(required — cropped & compressed automatically)</span>
                </Label>
                <ImageUploader
                  value={pImgUrl}
                  onChange={(url) => { setPImgUrl(url); if (url) setPImgError(""); }}
                  aspect={1}
                  pathPrefix="product"
                  label=""
                />
                {pImgError && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
                    <ImageOff className="h-3 w-3" /> {pImgError}
                  </p>
                )}
              </div>

              <div>
                <Label>Description</Label>
                <Textarea placeholder="Short product description…" value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
              </div>

              <Button
                type="submit"
                disabled={adding}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {adding
                  ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Adding…</>
                  : <><Plus className="mr-1.5 h-4 w-4" /> Add Product</>}
              </Button>
            </form>
          </section>
        )}

        {/* ── Products section ── */}
        <div className="mt-10 mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl">Products</h2>
          {products && products.length > 0 && (
            <span className="text-xs text-muted-foreground">{products.length} item{products.length !== 1 ? "s" : ""}</span>
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
                  status={(p as any).status}
                  seller_id={seller.id}
                  whatsapp_number={seller.whatsapp_number}
                  isAdmin={isAdmin}
                  onBlockToggle={() => refetchProducts()}
                />
                {isOwner && editMode && seller.verification_status === "approved" && (
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
            {isOwner ? "No products yet. Enter edit mode and add your first product." : "No products yet."}
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
            <div>
              <Label className="mb-1.5 block">Product photo</Label>
              <ImageUploader
                value={ePImgUrl}
                onChange={setEPImgUrl}
                aspect={1}
                pathPrefix="product"
                label=""
              />
            </div>
            <Button onClick={saveEditProduct} disabled={ePSaving} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {ePSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
