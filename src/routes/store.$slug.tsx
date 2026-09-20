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
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackView } from "@/lib/viewTracking";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { BackButton } from "@/components/BackButton";
import { VerificationBanner, ApprovedBanner } from "@/components/VerificationBanner";
import { SocialLinksAnnouncement } from "@/components/SocialLinksAnnouncement";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ImageUploader } from "@/components/ImageUploader";
import { SectionLoader } from "@/components/LoadingSpinner";
import {
  MapPin,
  Share2,
  Heart,
  Pencil,
  X,
  Check,
  Plus,
  Trash2,
  MessageCircle,
  Loader2,
  ImageOff,
  Instagram,
  Copy,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCity } from "@/lib/cityContext";
import { validateNigerianPhone } from "@/lib/whatsapp";
import { QRCodeSVG } from "qrcode.react";
import { getVendorStoreUrl, getVendorStoreDisplayUrl } from "@/lib/vendor-card/share";

function prettifySlug(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const Route = createFileRoute("/store/$slug")({
  beforeLoad: async (ctx) => (await import("@/lib/launchGate")).assertLaunchGate(ctx),
  component: StorePage,
  head: ({ params }) => {
    const name = prettifySlug(params.slug);
    const url = `https://zango-connect.vercel.app/store/${params.slug}`;
    const title = `${name} — ZANGO`;
    const description = `Shop ${name} on ZANGO. Browse products and order directly on WhatsApp.`;
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
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            name,
            url,
            description,
          }),
        },
      ],
    };
  },
});

const STOCK_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "low_stock", label: "Selling fast" },
  { value: "sold_out", label: "Sold out" },
];

// lucide-react has no Snapchat glyph — minimal inline ghost mark, currentColor so it themes.
function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2c2.9 0 5.1 2.3 5.1 5.4v1.9c0 .3.3.5.7.4l.7-.2c.4-.1.9.1 1 .5.1.4-.1.8-.5 1l-1 .4c-.3.1-.4.4-.3.7.4 1.2 1.3 2.1 2.6 2.6.3.1.5.5.4.8-.2.6-1 1-1.9 1.2-.1 0-.2.2-.2.3 0 .2 0 .5-.1.7-.1.3-.4.4-.7.4-.5 0-1-.1-1.6-.1-.6 0-1 .2-1.5.6-.8.6-1.6 1.2-2.9 1.2s-2.1-.6-2.9-1.2c-.5-.4-.9-.6-1.5-.6-.6 0-1.1.1-1.6.1-.3 0-.6-.1-.7-.4-.1-.2-.1-.5-.1-.7 0-.1-.1-.3-.2-.3-.9-.2-1.7-.6-1.9-1.2-.1-.3.1-.7.4-.8 1.3-.5 2.2-1.4 2.6-2.6.1-.3 0-.6-.3-.7l-1-.4c-.4-.2-.6-.6-.5-1 .1-.4.6-.6 1-.5l.7.2c.4.1.7-.1.7-.4V7.4C6.9 4.3 9.1 2 12 2z" />
    </svg>
  );
}

function StorePage() {
  const { slug } = Route.useParams();
  const qc = useQueryClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [mySellerId, setMySellerId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Vouch state
  const [hasVouched, setHasVouched] = useState(false);
  const [vouchLoading, setVouchLoading] = useState(false);
  const [localVouchCount, setLocalVouchCount] = useState<number | null>(null);

  // Edit fields
  const [eBusiness, setEBusiness] = useState("");
  const [eCity, setECity] = useState("");
  const [eCityId, setECityId] = useState<string | null>(null);
  const [eCategory, setECategory] = useState("");
  const [eBio, setEBio] = useState("");
  const [eWhatsapp, setEWhatsapp] = useState("");
  const [eInstagram, setEInstagram] = useState("");
  const [eSnapchat, setESnapchat] = useState("");
  const [eProfileUrl, setEProfileUrl] = useState<string | null>(null);
  const [eCoverUrl, setECoverUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { activeCities, citiesLoading } = useCity();

  // Add product — now uses ImageUploader (url-based) + image is REQUIRED
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pImgUrl, setPImgUrl] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pImgError, setPImgError] = useState("");

  // Edit product dialog
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [ePName, setEPName] = useState("");
  const [ePPrice, setEPPrice] = useState("");
  const [ePDesc, setEPDesc] = useState("");
  const [ePStock, setEPStock] = useState("available");
  const [ePImgUrl, setEPImgUrl] = useState<string | null>(null);
  const [ePSaving, setEPSaving] = useState(false);

  const [clicks, setClicks] = useState(0);
  const [categories, setCategories] = useState<{ name: string }[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  useEffect(() => {
    supabase
      .from("categories")
      .select("name")
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));

    const initAuth = async (uid: string) => {
      setUserId(uid);
      const [{ data: s }, { data: role }] = await Promise.all([
        supabase.from("sellers").select("id").eq("user_id", uid).maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid)
          .eq("role", "admin")
          .maybeSingle(),
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
        setUserId(null);
        setMySellerId(null);
        setIsOwner(false);
        setIsAdmin(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const { data: seller, isLoading } = useQuery({
    queryKey: ["seller", slug],
    queryFn: async () => {
      // Safe columns explicitly granted to anonymous visitors in DB migrations.
      const safeCols =
        "id, user_id, name, business_name, slug, whatsapp_number, city, city_id, category, bio, profile_photo_url, cover_photo_url, is_verified, rating, created_at, status, verification_status, is_blocked";
      const fullCols = `${safeCols}, instagram, snapchat`;

      // 1. Try selecting full columns (works for authenticated users / owners)
      try {
        const { data: fullData, error: fullError } = await supabase
          .from("sellers")
          .select(fullCols)
          .eq("slug", slug)
          .maybeSingle();
        if (!fullError && fullData) {
          return fullData;
        }
      } catch {
        // Fall through to safe query
      }

      // 2. Query safe columns (guaranteed to succeed for anon visitors)
      const { data: initialData, error } = await supabase
        .from("sellers")
        .select(safeCols)
        .eq("slug", slug)
        .maybeSingle();

      let data = initialData;

      // Case-insensitive fallback in case of URL case mismatch
      if (!data && !error) {
        const { data: ciData, error: ciError } = await supabase
          .from("sellers")
          .select(safeCols)
          .ilike("slug", slug)
          .maybeSingle();
        if (!ciError && ciData) {
          data = ciData;
        }
      }

      if (error) {
        console.error("[store] Error loading seller:", error);
        throw error;
      }
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
      const { count } = await supabase
        .from("vouches")
        .select("id", { count: "exact", head: true })
        .eq("vouched_seller_id", seller!.id);
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!seller || !mySellerId) return;
    supabase
      .from("vouches")
      .select("id")
      .eq("voucher_seller_id", mySellerId)
      .eq("vouched_seller_id", seller.id)
      .maybeSingle()
      .then(({ data }) => setHasVouched(!!data));
  }, [seller, mySellerId]);

  useEffect(() => {
    if (vouchCount !== undefined) setLocalVouchCount(vouchCount);
  }, [vouchCount]);

  // Log a store view — once per mount, and only once auth state has
  // resolved so the owner checking their own store and admins reviewing it
  // don't inflate the vendor's real view count.
  const viewLoggedRef = useRef(false);
  useEffect(() => {
    if (!seller || !authReady || viewLoggedRef.current) return;
    if (isOwner || isAdmin) return;
    viewLoggedRef.current = true;
    trackView("store", seller.id, seller.id);
  }, [seller, authReady, isOwner, isAdmin]);

  useEffect(() => {
    if (seller && userId) {
      const owned = seller.user_id === userId;
      setIsOwner(owned);
      if (owned) {
        supabase
          .from("sellers")
          .select("rejection_reason, instagram, snapchat")
          .eq("id", seller.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.rejection_reason) setRejectionReason(data.rejection_reason);
            if (data?.instagram) setEInstagram(data.instagram);
            if (data?.snapchat) setESnapchat(data.snapchat);
          });
        setEBusiness(seller.business_name);
        setECity(seller.city);
        setECityId(seller.city_id ?? null);
        setECategory(seller.category ?? "");
        setEBio(seller.bio ?? "");
        setEWhatsapp(seller.whatsapp_number);
        setEInstagram(seller.instagram ?? "");
        setESnapchat(seller.snapchat ?? "");
        setEProfileUrl(seller.profile_photo_url ?? null);
        setECoverUrl(seller.cover_photo_url ?? null);
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        supabase
          .from("whatsapp_clicks")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", seller.id)
          .gte("created_at", since)
          .then(({ count }) => setClicks(count ?? 0));
      }
    }
  }, [seller, userId]);

  if (isLoading) return <SectionLoader label="Loading store…" />;
  if (!seller)
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="p-10 text-center">
          <p className="font-serif text-2xl">Store not found</p>
          <Link to="/" className="mt-3 inline-block text-sm text-primary underline">
            Go home
          </Link>
        </div>
      </div>
    );

  // If store is unapproved, do not expose active storefront to public visitors
  if (!isOwner && !isAdmin && seller.verification_status !== "approved") {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-md px-5 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-2xl font-bold">Store Under Review</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            <strong>{seller.business_name}</strong> has submitted their store application and is currently awaiting administrator review and approval.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/">
              <Button variant="outline" className="w-full rounded-full">
                Explore Marketplace
              </Button>
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const productionStoreUrl = getVendorStoreUrl(seller.slug);
  const productionStorePill = getVendorStoreDisplayUrl(seller.slug);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(productionStoreUrl);
      toast.success("Store link copied!");
    } catch {}
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Check out my store on ZANGO 🛍️ ${productionStoreUrl}`)}`,
      "_blank",
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(productionStoreUrl);
      setHasCopiedLink(true);
      toast.success("Store link copied!");
      setTimeout(() => setHasCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleVouch = async () => {
    if (!userId || !mySellerId) {
      toast.error("Sign in as a seller to vouch");
      return;
    }
    if (mySellerId === seller.id) {
      toast.error("You can't vouch for yourself");
      return;
    }
    setVouchLoading(true);
    if (hasVouched) {
      const { error } = await supabase
        .from("vouches")
        .delete()
        .eq("voucher_seller_id", mySellerId)
        .eq("vouched_seller_id", seller.id);
      if (error) {
        toast.error(error.message);
        setVouchLoading(false);
        return;
      }
      setHasVouched(false);
      setLocalVouchCount((c) => Math.max(0, (c ?? 1) - 1));
      toast("Vouch removed");
    } else {
      const { error } = await supabase.from("vouches").insert({
        voucher_seller_id: mySellerId,
        vouched_seller_id: seller.id,
      });
      if (error) {
        toast.error(error.message.includes("duplicate") ? "Already vouched" : error.message);
        setVouchLoading(false);
        return;
      }
      setHasVouched(true);
      setLocalVouchCount((c) => (c ?? 0) + 1);
      toast.success("Vouched! Thank you 💛");
    }
    setVouchLoading(false);
    refetchVouchCount();
  };

  // Strip leading @ and, if a full profile URL was pasted, extract the bare
  // handle so we always store just the handle — outbound links are built
  // at render time from this.
  const normalizeInstagram = (input: string): string | null => {
    let v = input.trim();
    if (!v) return null;
    v = v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
    v = v.replace(/^@/, "");
    v = v.split(/[/?#]/)[0];
    return v || null;
  };
  const normalizeSnapchat = (input: string): string | null => {
    let v = input.trim();
    if (!v) return null;
    v = v.replace(/^https?:\/\/(www\.)?snapchat\.com\/add\//i, "");
    v = v.replace(/^@/, "");
    v = v.split(/[/?#]/)[0];
    return v || null;
  };

  const saveProfile = async () => {
    if (!eBusiness.trim()) {
      toast.error("Business name cannot be empty");
      return;
    }
    const phoneCheck = validateNigerianPhone(eWhatsapp);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.error);
      return;
    }
    setSaving(true);
    const updates: any = {
      business_name: eBusiness.trim(),
      city: eCity,
      city_id: eCityId,
      category: eCategory,
      bio: eBio,
      whatsapp_number: eWhatsapp,
      instagram: normalizeInstagram(eInstagram),
      snapchat: normalizeSnapchat(eSnapchat),
      profile_photo_url: eProfileUrl,
      cover_photo_url: eCoverUrl,
    };
    const { error } = await supabase.from("sellers").update(updates).eq("id", seller.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated!");
    qc.invalidateQueries({ queryKey: ["seller", slug] });
    setEditMode(false);
  };

  // Add product — image is now REQUIRED
  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (seller.verification_status !== "approved") {
      toast.error("Your store must be approved by an administrator before you can upload products.");
      return;
    }
    if (!pName.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!pPrice || Number(pPrice) <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    if (!pImgUrl) {
      setPImgError("A product image is required");
      return;
    }
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product added!");
    setPName("");
    setPPrice("");
    setPDesc("");
    setPImgUrl(null);
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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product updated!");
    setEditingProduct(null);
    refetchProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
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
            <Button
              size="sm"
              variant="outline"
              className="rounded-full h-7 text-xs"
              onClick={() => setEditMode(false)}
            >
              <X className="mr-1 h-3 w-3" /> Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-full h-7 text-xs bg-primary text-primary-foreground"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
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
        {/* ── Profile picture ── */}
        <div className="-mt-12 flex items-end gap-4">
          <div className="relative z-10 h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-background bg-secondary shadow-warm-lg ring-2 ring-primary/15">
            {seller.profile_photo_url ? (
              <img
                src={seller.profile_photo_url}
                alt={seller.business_name}
                className="h-full w-full object-cover"
              />
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

              <div>
                <Label>Business name</Label>
                <Input value={eBusiness} onChange={(e) => setEBusiness(e.target.value)} />
              </div>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCities.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={eCategory} onValueChange={setECategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bio (max 150 chars)</Label>
                <Textarea maxLength={150} value={eBio} onChange={(e) => setEBio(e.target.value)} />
              </div>
              <div>
                <Label>WhatsApp number</Label>
                <Input value={eWhatsapp} onChange={(e) => setEWhatsapp(e.target.value)} />
              </div>
              <div>
                <Label>Instagram (optional)</Label>
                <Input
                  placeholder="handle or profile link"
                  value={eInstagram}
                  onChange={(e) => setEInstagram(e.target.value)}
                />
              </div>
              <div>
                <Label>Snapchat (optional)</Label>
                <Input
                  placeholder="handle or profile link"
                  value={eSnapchat}
                  onChange={(e) => setESnapchat(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
                  {seller.business_name}
                </h1>
                {seller.is_verified && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="mt-1.5 cursor-default">
                          <VerifiedBadge className="h-6 w-6" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Vouched for by {localVouchCount ?? 0}+ trusted sellers
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-secondary px-3 py-1 font-medium text-secondary-foreground">
                  {seller.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {seller.city}
                </span>
                {(localVouchCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700 text-xs font-medium">
                    <Heart className="h-3 w-3 fill-amber-400 text-amber-400" /> {localVouchCount}{" "}
                    vouch{localVouchCount !== 1 ? "es" : ""}
                  </span>
                )}
              </div>
              {seller.bio && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{seller.bio}</p>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex gap-2">
            {isOwner ? (
              <>
                <Button
                  onClick={() => setEditMode(!editMode)}
                  variant={editMode ? "outline" : "default"}
                  className="flex-1 rounded-full"
                >
                  {editMode ? (
                    <>
                      <X className="mr-1.5 h-4 w-4" /> Exit edit mode
                    </>
                  ) : (
                    <>
                      <Pencil className="mr-1.5 h-4 w-4" /> Edit store
                    </>
                  )}
                </Button>
                <Button asChild variant="outline" className="flex-1 rounded-full">
                  <Link to="/seller/vendor-card">
                    <Share2 className="mr-1.5 h-4 w-4" /> Vendor card
                  </Link>
                </Button>
                <Button
                  onClick={() => setShowQrModal(true)}
                  variant="outline"
                  size="icon"
                  className="rounded-full shrink-0"
                  title="Store QR code"
                  aria-label="Store QR code"
                >
                  <QrCode className="h-4 w-4 text-primary" />
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleShare} variant="outline" className="flex-1 rounded-full">
                  <Share2 className="mr-1.5 h-4 w-4" /> Share store
                </Button>
                <Button
                  onClick={() => setShowQrModal(true)}
                  variant="outline"
                  size="icon"
                  className="rounded-full shrink-0"
                  title="Scan store QR code"
                  aria-label="Scan store QR code"
                >
                  <QrCode className="h-4 w-4 text-primary" />
                </Button>
                {canVouch && (
                  <Button
                    onClick={handleVouch}
                    disabled={vouchLoading}
                    variant="outline"
                    className={`rounded-full transition-colors ${hasVouched ? "border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100" : "hover:border-rose-300 hover:text-rose-500"}`}
                  >
                    {vouchLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Heart
                        className={`mr-1.5 h-4 w-4 transition-all ${hasVouched ? "fill-rose-500 text-rose-500 scale-110" : ""}`}
                      />
                    )}
                    {hasVouched ? "Vouched" : "Vouch"}
                  </Button>
                )}
              </>
            )}
            {seller.instagram && (
              <Button asChild variant="outline" size="icon" className="rounded-full shrink-0">
                <a
                  href={`https://instagram.com/${seller.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </Button>
            )}
            {seller.snapchat && (
              <Button asChild variant="outline" size="icon" className="rounded-full shrink-0">
                <a
                  href={`https://snapchat.com/add/${seller.snapchat}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Snapchat"
                >
                  <SnapchatIcon className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>

          {/* Vendor status banners & announcements — positioned directly above analytics */}
          {isOwner && (
            <div className="mt-5 space-y-3">
              {seller.verification_status && seller.verification_status !== "approved" && (
                <VerificationBanner
                  status={seller.verification_status as any}
                  reason={rejectionReason}
                />
              )}
              {seller.verification_status === "approved" && (
                <ApprovedBanner productCount={activeProducts.length} clicks7d={clicks} />
              )}
              {!editMode && (
                <SocialLinksAnnouncement
                  sellerId={seller.id}
                  hasSocialLinks={Boolean(seller.instagram || seller.snapchat)}
                  onAddNow={() => setEditMode(true)}
                />
              )}
            </div>
          )}

          {/* Owner analytics — shown always (not just edit mode) */}
          {isOwner && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border bg-card p-3.5 shadow-warm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Products live
                </p>
                <p className="mt-1.5 font-serif text-2xl text-primary">{activeProducts.length}</p>
              </div>
              <div className="rounded-xl border bg-card p-3.5 shadow-warm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <MessageCircle className="mr-1 inline h-3 w-3" />
                  WhatsApp (7d)
                </p>
                <p className="mt-1.5 font-serif text-2xl text-primary">{clicks}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-xl border bg-card p-3.5 shadow-warm">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Vouches
                </p>
                <p className="mt-1.5 font-serif text-2xl text-primary">{localVouchCount ?? 0}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Product uploads locked notice if unapproved owner in edit mode ── */}
        {isOwner && editMode && seller.verification_status !== "approved" && (
          <section className="mt-8 rounded-2xl border border-amber-300 bg-amber-50/80 p-5 text-amber-900 shadow-warm">
            <div className="flex items-center gap-2 font-semibold">
              <Clock className="h-5 w-5 text-amber-600" />
              Product Uploads Locked
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-amber-800">
              Your vendor application is currently under review by our admin team. You cannot upload products or publish new inventory until an administrator approves your store.
            </p>
          </section>
        )}

        {/* ── Add product form (owner + edit mode + approved) ── */}
        {isOwner && editMode && seller.verification_status === "approved" && (
          <section className="mt-8 rounded-2xl border border-primary/20 bg-card p-5 shadow-warm">
            <h2 className="mb-1 font-serif text-xl text-primary">Add New Product</h2>
            <p className="mb-4 text-xs text-muted-foreground">All fields marked * are required.</p>
            <form onSubmit={addProduct} className="space-y-4">
              <div>
                <Label>Product name *</Label>
                <Input
                  required
                  placeholder="e.g. Suya Plate"
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

              {/* Product image — REQUIRED, uses ImageUploader for crop + compress */}
              <div>
                <Label className="mb-1.5 block">
                  Product image *
                  <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                    (required — cropped & compressed automatically)
                  </span>
                </Label>
                <ImageUploader
                  value={pImgUrl}
                  onChange={(url) => {
                    setPImgUrl(url);
                    if (url) setPImgError("");
                  }}
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
                <Textarea
                  placeholder="Short product description…"
                  value={pDesc}
                  onChange={(e) => setPDesc(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={adding}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {adding ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Adding…
                  </>
                ) : (
                  <>
                    <Plus className="mr-1.5 h-4 w-4" /> Add Product
                  </>
                )}
              </Button>
            </form>
          </section>
        )}

        {/* ── Products section ── */}
        <div className="mt-10 mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl">Products</h2>
          {products && products.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {products.length} item{products.length !== 1 ? "s" : ""}
            </span>
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
                  seller_name={seller.business_name}
                  seller_city={seller.city}
                  seller_slug={seller.slug}
                  whatsapp_number={seller.whatsapp_number}
                  seller_is_verified={seller.is_verified}
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
            {isOwner
              ? "No products yet. Enter edit mode and add your first product."
              : "No products yet."}
          </div>
        )}
      </div>

      <Footer />

      {/* ── Edit product dialog ── */}
      <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={ePName} onChange={(e) => setEPName(e.target.value)} />
            </div>
            <div>
              <Label>Price (₦)</Label>
              <Input
                type="number"
                min="0"
                value={ePPrice}
                onChange={(e) => setEPPrice(e.target.value)}
              />
            </div>
            <div>
              <Label>Stock status</Label>
              <Select value={ePStock} onValueChange={setEPStock}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={ePDesc} onChange={(e) => setEPDesc(e.target.value)} />
            </div>
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
            <Button
              onClick={saveEditProduct}
              disabled={ePSaving}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {ePSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Storefront Scannable QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md text-center p-6 bg-[#FAF6F0] border-2 border-border-warm">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="font-serif text-2xl font-black text-[#24150E]">
              {seller.business_name}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-[#7C6556]">
              Scan with your phone camera to visit this verified storefront directly.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-col items-center justify-center">
            {/* Scannable QR Code linking to store */}
            <div className="rounded-2xl border-2 border-[#804723] bg-white p-4 shadow-xl">
              <QRCodeSVG
                value={productionStoreUrl}
                size={190}
                bgColor="#FFFFFF"
                fgColor="#24150E"
                level="Q"
              />
            </div>

            {/* Accurate Production URL Pill */}
            <div className="mt-4 inline-flex items-center rounded-full bg-[#3A2013] px-4 py-1.5 text-xs sm:text-sm font-bold tracking-wide text-white shadow-xs max-w-full truncate">
              <span className="truncate">{productionStorePill}</span>
            </div>

            <p className="mt-2 text-xs font-medium text-[#7C6556]">
              Instant access • No app install needed
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex-1 rounded-full gap-1.5 h-10 text-xs font-semibold bg-white border-border-warm text-[#24150E] hover:bg-muted/50"
            >
              {hasCopiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Store Link</span>
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`Check out ${seller.business_name} on ZANGO 🛍️ ${productionStoreUrl}`)}`,
                  "_blank",
                );
              }}
              className="flex-1 rounded-full gap-1.5 h-10 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-xs"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Share on WhatsApp</span>
            </Button>
          </div>

          {isOwner && (
            <div className="pt-3 border-t border-[#D9C6B6]/60 mt-3">
              <Button asChild variant="ghost" className="w-full text-xs text-[#804723] hover:text-[#5c3014] font-bold">
                <Link to="/seller/vendor-card">
                  Open Marketing Card Studio & Download Graphics →
                </Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
