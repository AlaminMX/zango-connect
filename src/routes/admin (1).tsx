/**
 * admin.tsx
 * Full-featured admin panel:
 *   1. Overview stats
 *   2. Seller management — approve/reject, verify, block, delete, manual badge grant/revoke
 *   3. Category management — now with image upload (replaces emoji)
 *   4. Products management — inline block/unblock + featured control
 *   5. Homepage sections management
 *   6. Vouch analytics — count per seller + voucher list
 *
 * FIXES:
 *  - Auth uses getSession() (localStorage) instead of getUser() (network request),
 *    which was causing admins to be logged out on every page refresh.
 *  - Added Approve / Reject controls for sellers with verification_status = "pending".
 *  - verification_status is now fetched and displayed on each seller row.
 */

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { ImageUploader } from "@/components/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BadgeCheck, Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  Star, StarOff, Eye, EyeOff, Loader2, GripVertical,
  ShieldOff, ShieldCheck, Users, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { PageLoader } from "@/components/LoadingSpinner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

interface SellerRow {
  id: string; business_name: string; slug: string;
  category: string; city: string; is_verified: boolean; is_blocked: boolean;
  verification_status: string; rejection_reason?: string | null;
}
interface Category   { id: string; name: string; slug: string; icon_emoji: string; image_url: string | null; sort_order: number; }
interface ProductRow {
  id: string; name: string; price: number; image_url: string | null;
  is_featured: boolean; featured_order: number; status: string;
  sellers: { business_name: string; city: string } | null;
}
interface Section    { id: string; key: string; title: string; subtitle: string | null; content: string | null; sort_order: number; is_visible: boolean; }
interface VouchRow   { seller_id: string; seller_name: string; vouch_count: number; }
interface VoucherDetail { voucher_seller_id: string; business_name: string; created_at: string; }

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

/** Badge colour for verification_status */
function VerifBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-700" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "Rejected", cls: "bg-rose-100 text-rose-700" },
    suspended:{ label: "Suspended",cls: "bg-gray-100 text-gray-600" },
  };
  const { label, cls } = cfg[status] ?? { label: status, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function AdminPage() {
  const nav = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const [sellers,    setSellers]    = useState<SellerRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products,   setProducts]   = useState<ProductRow[]>([]);
  const [sections,   setSections]   = useState<Section[]>([]);
  const [vouches,    setVouches]    = useState<VouchRow[]>([]);
  const [stats,      setStats]      = useState({ sellers: 0, products: 0, clicks: 0 });
  const [activeTab,  setActiveTab]  = useState<"sellers"|"categories"|"products"|"vouches"|"homepage">("sellers");

  // Category editor state
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName,    setCatName]    = useState("");
  const [catImage,   setCatImage]   = useState<string | null>(null);
  const [catSaving,  setCatSaving]  = useState(false);
  const [newCatOpen, setNewCatOpen] = useState(false);

  // Section editor state
  const [editingSec,  setEditingSec]  = useState<Section | null>(null);
  const [secTitle,    setSecTitle]    = useState("");
  const [secSubtitle, setSecSubtitle] = useState("");
  const [secContent,  setSecContent]  = useState("");
  const [secSaving,   setSecSaving]   = useState(false);

  // Vouch detail modal
  const [vouchDetail, setVouchDetail] = useState<{ seller_name: string; vouchers: VoucherDetail[] } | null>(null);
  const [vouchDetailLoading, setVouchDetailLoading] = useState(false);

  // Reject dialog state
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);

  // ── FIX: use getSession() (reads localStorage instantly) instead of getUser()
  // (getUser() makes a server-side network request — on refresh it could fail
  //  before the token is refreshed, which was causing automatic logouts) ──
  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) { nav({ to: "/auth" }); return; }
      const uid = sessionData.session.user.id;
      const { data: role } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", uid).eq("role", "admin").maybeSingle();
      if (!role) { nav({ to: "/" }); return; }
      setAllowed(true);
      await loadAll();
    })();
  }, [nav]);

  const loadAll = async () => {
    const [
      { data: sl },
      { count: pc },
      { count: cc },
      { data: cats },
      { data: prods },
      { data: secs },
    ] = await Promise.all([
      // ── FIX: include verification_status + rejection_reason in seller fetch ──
      supabase.from("sellers").select(
        "id, business_name, slug, category, city, is_verified, is_blocked, verification_status, rejection_reason"
      ).order("created_at", { ascending: false }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("whatsapp_clicks").select("id", { count: "exact", head: true }),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products")
        .select("id, name, price, image_url, is_featured, featured_order, status, sellers(business_name, city)")
        .order("is_featured", { ascending: false }).order("featured_order").limit(100),
      supabase.from("homepage_sections").select("*").order("sort_order"),
    ]);
    setSellers(sl ?? []);
    setCategories((cats ?? []) as Category[]);
    setProducts((prods ?? []) as any);
    setSections(secs ?? []);
    setStats({ sellers: sl?.length ?? 0, products: pc ?? 0, clicks: cc ?? 0 });

    // Load vouch analytics
    const { data: vData } = await supabase
      .from("vouches")
      .select("vouched_seller_id, sellers!vouches_vouched_seller_id_fkey(business_name)");
    if (vData) {
      const map = new Map<string, { name: string; count: number }>();
      for (const row of vData as any[]) {
        const id = row.vouched_seller_id;
        const name = row.sellers?.business_name ?? "Unknown";
        if (!map.has(id)) map.set(id, { name, count: 0 });
        map.get(id)!.count += 1;
      }
      setVouches(Array.from(map.entries())
        .map(([seller_id, { name, count }]) => ({ seller_id, seller_name: name, vouch_count: count }))
        .sort((a, b) => b.vouch_count - a.vouch_count));
    }
  };

  // ── Seller verification approval ──
  const approveSeller = async (id: string, name: string) => {
    const { error } = await supabase
      .from("sellers")
      .update({ verification_status: "approved", rejection_reason: null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSellers((prev) => prev.map((s) =>
      s.id === id ? { ...s, verification_status: "approved", rejection_reason: null } : s
    ));
    toast.success(`"${name}" approved ✅ — their store is now live`);
  };

  // ── Seller rejection (opens dialog) ──
  const openRejectDialog = (id: string, name: string) => {
    setRejectTarget({ id, name });
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejectSaving(true);
    const { error } = await supabase
      .from("sellers")
      .update({
        verification_status: "rejected",
        rejection_reason: rejectReason.trim() || "Your application did not meet our requirements.",
      })
      .eq("id", rejectTarget.id);
    setRejectSaving(false);
    if (error) { toast.error(error.message); return; }
    setSellers((prev) => prev.map((s) =>
      s.id === rejectTarget.id
        ? { ...s, verification_status: "rejected", rejection_reason: rejectReason.trim() }
        : s
    ));
    toast.success(`"${rejectTarget.name}" rejected`);
    setRejectTarget(null);
  };

  // ── Re-open a rejected seller for re-review ──
  const resetToPending = async (id: string, name: string) => {
    const { error } = await supabase
      .from("sellers")
      .update({ verification_status: "pending", rejection_reason: null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSellers((prev) => prev.map((s) =>
      s.id === id ? { ...s, verification_status: "pending", rejection_reason: null } : s
    ));
    toast.success(`"${name}" reset to pending review`);
  };

  // ── Seller verification (gold badge) ──
  const toggleVerify = async (id: string, current: boolean) => {
    const { error } = await supabase.from("sellers").update({ is_verified: !current }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSellers((prev) => prev.map((s) => s.id === id ? { ...s, is_verified: !current } : s));
    toast.success(!current ? "Badge granted ⭐" : "Badge removed");
  };

  // ── Seller block/unblock ──
  const toggleBlock = async (id: string, current: boolean) => {
    const { error } = await supabase.from("sellers").update({ is_blocked: !current }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSellers((prev) => prev.map((s) => s.id === id ? { ...s, is_blocked: !current } : s));
    toast.success(!current ? "Seller blocked" : "Seller unblocked");
  };

  // ── Seller delete ──
  const deleteSeller = async (id: string, name: string) => {
    if (!confirm(`PERMANENTLY DELETE seller "${name}"?\n\nThis will remove their profile, all products, and all related data. This cannot be undone.`)) return;
    const { error } = await supabase.from("sellers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSellers((prev) => prev.filter((s) => s.id !== id));
    toast.success("Seller permanently deleted");
  };

  // ── Categories ──
  const openNewCat  = () => { setCatName(""); setCatImage(null); setEditingCat(null); setNewCatOpen(true); };
  const openEditCat = (c: Category) => { setCatName(c.name); setCatImage(c.image_url); setEditingCat(c); setNewCatOpen(true); };

  const saveCat = async () => {
    if (!catName.trim()) { toast.error("Category name required"); return; }
    setCatSaving(true);
    if (editingCat) {
      const { error } = await supabase.from("categories").update({ name: catName.trim(), image_url: catImage }).eq("id", editingCat.id);
      if (error) { toast.error(error.message); setCatSaving(false); return; }
      toast.success("Category updated");
    } else {
      const newSlug = slugify(catName);
      const maxOrder = Math.max(0, ...categories.map((c) => c.sort_order));
      const { error } = await supabase.from("categories").insert({ name: catName.trim(), slug: newSlug, icon_emoji: "🛍️", image_url: catImage, sort_order: maxOrder + 1 });
      if (error) { toast.error(error.message); setCatSaving(false); return; }
      toast.success("Category created");
    }
    setCatSaving(false); setNewCatOpen(false); await loadAll();
  };

  const deleteCat = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Sellers using it won't be affected.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Category deleted"); setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const moveCat = async (id: string, dir: "up" | "down") => {
    const idx = categories.findIndex((c) => c.id === id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const updated = [...categories];
    [updated[idx].sort_order, updated[swapIdx].sort_order] = [updated[swapIdx].sort_order, updated[idx].sort_order];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setCategories([...updated]);
    await Promise.all([
      supabase.from("categories").update({ sort_order: updated[idx].sort_order }).eq("id", updated[idx].id),
      supabase.from("categories").update({ sort_order: updated[swapIdx].sort_order }).eq("id", updated[swapIdx].id),
    ]);
  };

  // ── Product block/unblock ──
  const toggleProductStatus = async (id: string, current: string) => {
    const newStatus = current === "active" ? "blocked" : "active";
    const { error } = await supabase.from("products").update({ status: newStatus }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, status: newStatus } : p));
    toast.success(newStatus === "blocked" ? "Product blocked" : "Product unblocked");
  };

  // ── Featured products ──
  const toggleFeatured = async (p: ProductRow) => {
    const maxOrder = Math.max(0, ...products.filter((x) => x.is_featured).map((x) => x.featured_order));
    const updates = p.is_featured
      ? { is_featured: false, featured_order: 0 }
      : { is_featured: true,  featured_order: maxOrder + 1 };
    const { error } = await supabase.from("products").update(updates).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setProducts((prev) => prev.map((x) => x.id === p.id ? { ...x, ...updates } : x).sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return a.featured_order - b.featured_order;
    }));
    toast.success(p.is_featured ? "Removed from featured" : "Added to featured ⭐");
  };

  const moveFeatured = async (id: string, dir: "up" | "down") => {
    const feat = products.filter((p) => p.is_featured).sort((a, b) => a.featured_order - b.featured_order);
    const idx = feat.findIndex((p) => p.id === id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= feat.length) return;
    const [a, b] = [feat[idx], feat[swapIdx]];
    const temp = a.featured_order;
    await Promise.all([
      supabase.from("products").update({ featured_order: b.featured_order }).eq("id", a.id),
      supabase.from("products").update({ featured_order: temp }).eq("id", b.id),
    ]);
    await loadAll();
  };

  // ── Homepage sections ──
  const openEditSection = (s: Section) => {
    setEditingSec(s); setSecTitle(s.title); setSecSubtitle(s.subtitle ?? ""); setSecContent(s.content ?? "");
  };

  const saveSection = async () => {
    if (!editingSec) return;
    setSecSaving(true);
    const { error } = await supabase.from("homepage_sections").update({
      title: secTitle.trim(), subtitle: secSubtitle.trim() || null, content: secContent.trim() || null,
    }).eq("id", editingSec.id);
    setSecSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Section updated");
    setSections((prev) => prev.map((s) => s.id === editingSec.id ? { ...s, title: secTitle, subtitle: secSubtitle, content: secContent } : s));
    setEditingSec(null);
  };

  const toggleSectionVisible = async (s: Section) => {
    const { error } = await supabase.from("homepage_sections").update({ is_visible: !s.is_visible }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    setSections((prev) => prev.map((x) => x.id === s.id ? { ...x, is_visible: !s.is_visible } : x));
    toast.success(s.is_visible ? "Section hidden" : "Section shown");
  };

  const moveSec = async (id: string, dir: "up" | "down") => {
    const idx = sections.findIndex((s) => s.id === id);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sections.length) return;
    const updated = [...sections];
    [updated[idx].sort_order, updated[swapIdx].sort_order] = [updated[swapIdx].sort_order, updated[idx].sort_order];
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    setSections([...updated]);
    await Promise.all([
      supabase.from("homepage_sections").update({ sort_order: updated[idx].sort_order }).eq("id", updated[idx].id),
      supabase.from("homepage_sections").update({ sort_order: updated[swapIdx].sort_order }).eq("id", updated[swapIdx].id),
    ]);
  };

  // ── Vouch detail ──
  const openVouchDetail = async (sellerId: string, sellerName: string) => {
    setVouchDetailLoading(true);
    const { data } = await supabase
      .from("vouches")
      .select("voucher_seller_id, created_at, sellers!vouches_voucher_seller_id_fkey(business_name)")
      .eq("vouched_seller_id", sellerId)
      .order("created_at", { ascending: false });
    setVouchDetail({
      seller_name: sellerName,
      vouchers: (data ?? []).map((r: any) => ({
        voucher_seller_id: r.voucher_seller_id,
        business_name: r.sellers?.business_name ?? "Unknown",
        created_at: r.created_at,
      })),
    });
    setVouchDetailLoading(false);
  };

  if (allowed === null) return <PageLoader label="Loading admin…" />;

  const tabCls = (t: typeof activeTab) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition ${activeTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`;

  const featuredProducts  = products.filter((p) => p.is_featured).sort((a, b) => a.featured_order - b.featured_order);
  const unfeaturedProducts = products.filter((p) => !p.is_featured);

  // Group sellers by verification status for a cleaner list
  const pendingSellers   = sellers.filter((s) => s.verification_status === "pending");
  const approvedSellers  = sellers.filter((s) => s.verification_status === "approved");
  const otherSellers     = sellers.filter((s) => s.verification_status !== "pending" && s.verification_status !== "approved");

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <h1 className="font-serif text-3xl">Admin Panel</h1>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "Sellers",   value: stats.sellers },
            { label: "Products",  value: stats.products },
            { label: "WA clicks", value: stats.clicks },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-4 shadow-warm">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-serif text-3xl text-primary">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Pending approval alert */}
        {pendingSellers.length > 0 && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <Clock className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <strong>{pendingSellers.length}</strong> seller{pendingSellers.length !== 1 ? "s are" : " is"} waiting for approval.{" "}
              <button onClick={() => setActiveTab("sellers")} className="underline">Review now →</button>
            </span>
          </div>
        )}

        {/* Tab nav */}
        <div className="mt-8 flex flex-wrap gap-2">
          {(["sellers","categories","products","vouches","homepage"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)} className={tabCls(t)}>
              {t === "sellers"    ? `Sellers ${pendingSellers.length > 0 ? `(${pendingSellers.length} pending)` : ""}` :
               t === "categories" ? "Categories" :
               t === "products"   ? "Products" :
               t === "vouches"    ? "Vouches" : "Homepage"}
            </button>
          ))}
        </div>

        {/* ── Sellers tab ── */}
        {activeTab === "sellers" && (
          <section className="mt-6 space-y-8">

            {/* Pending sellers — shown at top, action required */}
            {pendingSellers.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 font-serif text-xl">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Awaiting Approval ({pendingSellers.length})
                </h2>
                <div className="space-y-2">
                  {pendingSellers.map((s) => (
                    <SellerRow
                      key={s.id} s={s}
                      onApprove={() => approveSeller(s.id, s.business_name)}
                      onReject={() => openRejectDialog(s.id, s.business_name)}
                      onResetPending={null}
                      onToggleVerify={() => toggleVerify(s.id, s.is_verified)}
                      onToggleBlock={() => toggleBlock(s.id, s.is_blocked)}
                      onDelete={() => deleteSeller(s.id, s.business_name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Approved sellers */}
            {approvedSellers.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 font-serif text-xl">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Approved Sellers ({approvedSellers.length})
                </h2>
                <div className="space-y-2">
                  {approvedSellers.map((s) => (
                    <SellerRow
                      key={s.id} s={s}
                      onApprove={null}
                      onReject={() => openRejectDialog(s.id, s.business_name)}
                      onResetPending={null}
                      onToggleVerify={() => toggleVerify(s.id, s.is_verified)}
                      onToggleBlock={() => toggleBlock(s.id, s.is_blocked)}
                      onDelete={() => deleteSeller(s.id, s.business_name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Rejected / other sellers */}
            {otherSellers.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 font-serif text-xl">
                  <XCircle className="h-5 w-5 text-rose-400" />
                  Rejected / Suspended ({otherSellers.length})
                </h2>
                <div className="space-y-2">
                  {otherSellers.map((s) => (
                    <SellerRow
                      key={s.id} s={s}
                      onApprove={() => approveSeller(s.id, s.business_name)}
                      onReject={null}
                      onResetPending={() => resetToPending(s.id, s.business_name)}
                      onToggleVerify={() => toggleVerify(s.id, s.is_verified)}
                      onToggleBlock={() => toggleBlock(s.id, s.is_blocked)}
                      onDelete={() => deleteSeller(s.id, s.business_name)}
                    />
                  ))}
                </div>
              </div>
            )}

            {sellers.length === 0 && <p className="text-sm text-muted-foreground">No sellers yet.</p>}
          </section>
        )}

        {/* ── Categories tab ── */}
        {activeTab === "categories" && (
          <section className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-xl">Categories ({categories.length})</h2>
              <Button onClick={openNewCat} size="sm" className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-1 h-4 w-4" /> New category
              </Button>
            </div>
            <div className="space-y-2">
              {categories.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-warm">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl">{c.icon_emoji}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">/{c.slug}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveCat(c.id, "up")} disabled={idx === 0}
                      className="rounded p-1 hover:bg-muted disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                    <button onClick={() => moveCat(c.id, "down")} disabled={idx === categories.length - 1}
                      className="rounded p-1 hover:bg-muted disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                    <button onClick={() => openEditCat(c)} className="rounded p-1 hover:bg-muted">
                      <Pencil className="h-4 w-4" /></button>
                    <button onClick={() => deleteCat(c.id, c.name)} className="rounded p-1 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Products tab ── */}
        {activeTab === "products" && (
          <section className="mt-6">
            <h2 className="mb-2 font-serif text-xl">Products ({products.length})</h2>
            <p className="mb-4 text-xs text-muted-foreground">Block products to hide them everywhere. Featured control is also here.</p>

            {featuredProducts.length > 0 && (
              <div className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Featured ({featuredProducts.length})</p>
                <div className="space-y-2">
                  {featuredProducts.map((p, idx) => (
                    <div key={p.id} className={`flex items-center gap-3 rounded-xl border bg-card p-3 shadow-warm ${p.status === "blocked" ? "border-destructive/30 opacity-60" : ""}`}>
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground">₦{Number(p.price).toLocaleString()} · {(p.sellers as any)?.business_name}
                          {p.status === "blocked" && <span className="ml-2 text-destructive">● blocked</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveFeatured(p.id, "up")} disabled={idx === 0}
                          className="rounded p-1 hover:bg-muted disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                        <button onClick={() => moveFeatured(p.id, "down")} disabled={idx === featuredProducts.length - 1}
                          className="rounded p-1 hover:bg-muted disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                        <button onClick={() => toggleFeatured(p)} className="rounded p-1 text-primary hover:bg-primary/10">
                          <StarOff className="h-4 w-4" /></button>
                        <button onClick={() => toggleProductStatus(p.id, p.status)}
                          className={`rounded p-1 transition ${p.status === "blocked" ? "text-green-600 hover:bg-green-50" : "text-destructive hover:bg-destructive/10"}`}>
                          {p.status === "blocked" ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">All products</p>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {unfeaturedProducts.map((p) => (
                <div key={p.id} className={`flex items-center gap-3 rounded-xl border bg-card p-3 shadow-warm ${p.status === "blocked" ? "border-destructive/30 opacity-60" : "opacity-70 hover:opacity-100"}`}>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">₦{Number(p.price).toLocaleString()} · {(p.sellers as any)?.business_name}
                      {p.status === "blocked" && <span className="ml-2 text-destructive">● blocked</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleFeatured(p)} className="rounded p-1 text-muted-foreground hover:text-primary">
                      <Star className="h-4 w-4" /></button>
                    <button onClick={() => toggleProductStatus(p.id, p.status)}
                      className={`rounded p-1 transition ${p.status === "blocked" ? "text-green-600 hover:bg-green-50" : "text-destructive hover:bg-destructive/10"}`}>
                      {p.status === "blocked" ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
              {products.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
            </div>
          </section>
        )}

        {/* ── Vouches tab ── */}
        {activeTab === "vouches" && (
          <section className="mt-6">
            <h2 className="mb-2 font-serif text-xl">Vouch Analytics</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Badge is earned after 5 vouches from verified sellers. Click a row to see who vouched.
            </p>
            {vouches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vouches recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {vouches.map((v) => (
                  <button
                    key={v.seller_id}
                    onClick={() => openVouchDetail(v.seller_id, v.seller_name)}
                    className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 shadow-warm text-left transition hover:border-primary/30 hover:bg-muted/30"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 font-bold text-sm">
                      {v.vouch_count}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{v.seller_name}</p>
                      <p className="text-xs text-muted-foreground">{v.vouch_count} vouch{v.vouch_count !== 1 ? "es" : ""} · click to see who</p>
                    </div>
                    {v.vouch_count >= 5 && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-amber-500 shrink-0">
                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Homepage sections tab ── */}
        {activeTab === "homepage" && (
          <section className="mt-6">
            <h2 className="mb-2 font-serif text-xl">Homepage Sections</h2>
            <p className="mb-4 text-xs text-muted-foreground">Edit text, show/hide, and reorder sections on the homepage.</p>
            <div className="space-y-3">
              {sections.map((s, idx) => (
                <div key={s.id} className={`rounded-xl border bg-card p-4 shadow-warm ${!s.is_visible ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{s.title}</p>
                      {s.subtitle && <p className="text-xs text-muted-foreground">{s.subtitle}</p>}
                      {s.content  && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.content}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button onClick={() => moveSec(s.id, "up")} disabled={idx === 0}
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                      <button onClick={() => moveSec(s.id, "down")} disabled={idx === sections.length - 1}
                        className="rounded p-1 hover:bg-muted disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
                      <button onClick={() => toggleSectionVisible(s)} className="rounded p-1 hover:bg-muted">
                        {s.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      <button onClick={() => openEditSection(s)} className="rounded p-1 hover:bg-muted">
                        <Pencil className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }} className="mt-10">
          Sign out
        </Button>
      </div>

      {/* ── Category editor dialog ── */}
      <Dialog open={newCatOpen} onOpenChange={(o) => !o && setNewCatOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Name *</Label><Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Electronics" /></div>
            <div>
              <Label>Category image</Label>
              <p className="mb-2 text-xs text-muted-foreground">Replaces emoji — displayed on homepage, category pages, and filters.</p>
              <ImageUploader
                value={catImage}
                onChange={setCatImage}
                bucket="sutura"
                pathPrefix="categories"
                aspect={1}
                shape="rect"
                label=""
              />
            </div>
            <Button onClick={saveCat} disabled={catSaving} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {catSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Section editor dialog ── */}
      <Dialog open={!!editingSec} onOpenChange={(o) => !o && setEditingSec(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit section — <span className="text-muted-foreground font-normal">{editingSec?.key}</span></DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={secTitle} onChange={(e) => setSecTitle(e.target.value)} /></div>
            <div><Label>Subtitle (Hausa or tagline)</Label><Input value={secSubtitle} onChange={(e) => setSecSubtitle(e.target.value)} /></div>
            <div><Label>Body text (optional)</Label><Textarea value={secContent} onChange={(e) => setSecContent(e.target.value)} rows={3} /></div>
            <Button onClick={saveSection} disabled={secSaving} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              {secSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Vouch detail dialog ── */}
      <Dialog open={!!vouchDetail} onOpenChange={(o) => !o && setVouchDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who vouched for {vouchDetail?.seller_name}</DialogTitle>
          </DialogHeader>
          {vouchDetailLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : vouchDetail?.vouchers.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground text-center">No vouchers found.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {vouchDetail?.vouchers.map((v) => (
                <div key={v.voucher_seller_id} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium">{v.business_name}</span>
                  <span className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject seller dialog ── */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject "{rejectTarget?.name}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The seller will see this reason in their dashboard. Be specific so they know what to fix.
            </p>
            <div>
              <Label>Reason for rejection</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g. Profile photo is missing or unclear. Please upload a clear photo of yourself or your products and reapply."
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={confirmReject}
                disabled={rejectSaving}
                className="flex-1 rounded-full bg-destructive text-white hover:bg-destructive/90"
              >
                {rejectSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rejecting…</> : "Confirm reject"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Extracted seller row component for reuse across status groups       */
/* ------------------------------------------------------------------ */
function SellerRow({
  s,
  onApprove,
  onReject,
  onResetPending,
  onToggleVerify,
  onToggleBlock,
  onDelete,
}: {
  s: SellerRow;
  onApprove: (() => void) | null;
  onReject: (() => void) | null;
  onResetPending: (() => void) | null;
  onToggleVerify: () => void;
  onToggleBlock: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={`rounded-xl border bg-card p-3 shadow-warm ${s.is_blocked ? "border-destructive/30 opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link to="/store/$slug" params={{ slug: s.slug }} className="truncate font-medium hover:text-primary">
              {s.business_name}
            </Link>
            {s.is_verified && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-amber-500" aria-label="Verified">
                <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
            )}
            <VerifBadge status={s.verification_status} />
            {s.is_blocked && (
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">BLOCKED</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{s.category} · {s.city}</p>
          {s.rejection_reason && (
            <p className="mt-1 text-xs text-rose-600 italic">Rejection: {s.rejection_reason}</p>
          )}
        </div>

        {/* Admin actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 text-xs">

          {/* Approve button — shown for pending and rejected sellers */}
          {onApprove && (
            <button
              onClick={onApprove}
              className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700 transition hover:bg-emerald-200"
              title="Approve seller"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </button>
          )}

          {/* Reject button — shown for pending and approved sellers */}
          {onReject && (
            <button
              onClick={onReject}
              className="flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-rose-700 transition hover:bg-rose-200"
              title="Reject seller"
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
          )}

          {/* Reset to pending — for rejected sellers */}
          {onResetPending && (
            <button
              onClick={onResetPending}
              className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 transition hover:bg-amber-200"
              title="Reset to pending review"
            >
              <Clock className="h-3.5 w-3.5" /> Re-review
            </button>
          )}

          {/* Gold badge toggle */}
          <button
            onClick={onToggleVerify}
            title={s.is_verified ? "Revoke badge" : "Grant badge"}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 transition ${s.is_verified ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-600"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
            </svg>
            {s.is_verified ? "Revoke" : "Badge"}
          </button>

          {/* Block/unblock */}
          <button
            onClick={onToggleBlock}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 transition ${s.is_blocked ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}
          >
            {s.is_blocked ? <><ShieldCheck className="h-3.5 w-3.5" /> Unblock</> : <><ShieldOff className="h-3.5 w-3.5" /> Block</>}
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-destructive transition hover:bg-destructive hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
