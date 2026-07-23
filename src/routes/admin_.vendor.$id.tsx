/**
 * admin.vendor.$id.tsx — Admin-only Vendor Details page.
 *
 * Reached from the Sellers tab in /admin (SellerRow's name link now points
 * here instead of the public /store/$slug storefront).
 *
 * Data honesty notes, so future-you doesn't assume more precision than
 * exists:
 *  - Store/product views come from page_views, live as of this build. It's
 *    a raw insert-per-render counter with no dedup — see the migration
 *    comment for the known limitation.
 *  - "Vendor Activity" merges real admin_audit_log entries (actions taken
 *    ON this seller) with product created_at/price_updated_at events.
 *    There is NO login-event log — "Logged in" from the original spec is
 *    not shown because that data doesn't exist yet.
 *  - Email + last login come from auth.users via the getVendorAuthInfo
 *    server function (the one thing that genuinely needs service-role
 *    access — RLS can't expose auth.users to any client role).
 *  - Vendor Health Score was dropped for this pass per your call — not
 *    included here.
 */

import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { TopBar } from "@/components/TopBar";
import { BackButton } from "@/components/BackButton";
import { PageLoader } from "@/components/LoadingSpinner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVendorAuthInfo } from "@/lib/admin.functions";
import { normaliseNigerianPhone, buildWhatsAppUrl } from "@/lib/whatsapp";
import { toast } from "sonner";
import {
  Phone, Copy, MessageCircle, Mail, Star, StarOff, ShieldOff, ShieldCheck,
  Trash2, Pencil, Loader2, AlertCircle, Save,
  Package, Eye, MousePointerClick, TrendingUp, Clock,
} from "lucide-react";

export const Route = createFileRoute("/admin_/vendor/$id")({ component: VendorDetailPage });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Seller {
  id: string; user_id: string; name: string; business_name: string; slug: string;
  category: string; city: string; whatsapp_number: string;
  is_verified: boolean; is_blocked: boolean; verification_status: string;
  created_at: string; rejection_reason: string | null;
}
interface Product {
  id: string; name: string; price: number | null; status: string;
  is_featured: boolean; image_url: string | null; description: string | null;
  stock_status: string; created_at: string; price_updated_at: string | null;
  clicks: number; views: number;
}
interface Warning { id: string; reason: string | null; created_at: string; }
interface ActivityItem { id: string; label: string; detail?: string; created_at: string; }

/** Derives the account-status label from existing fields — deliberately NOT
 *  a new column. is_blocked / verification_status already carry this. */
function accountStatus(s: Seller): { label: string; cls: string } {
  if (s.is_blocked) return { label: "Suspended", cls: "bg-destructive/10 text-destructive" };
  if (s.verification_status === "pending") return { label: "Pending Verification", cls: "bg-amber-100 text-amber-700" };
  return { label: "Active", cls: "bg-emerald-100 text-emerald-700" };
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-warm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 font-serif text-2xl text-primary">{value}</p>
    </div>
  );
}

function VendorDetailPage() {
  const { id } = useParams({ from: "/admin_/vendor/$id" });
  const nav = useNavigate();
  const { user, isAdmin, isReady } = useAuth();
  const allowed = isReady && !!user && isAdmin;

  useEffect(() => {
    if (!isReady) return;
    if (!user) { nav({ to: "/auth", replace: true }); return; }
    if (!isAdmin) { nav({ to: "/", replace: true }); return; }
  }, [isReady, user, isAdmin, nav]);

  const [seller, setSeller]     = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [note, setNote]         = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [authInfo, setAuthInfo] = useState<{ email: string | null; lastSignInAt: string | null } | null>(null);
  const [authInfoError, setAuthInfoError] = useState<string | null>(null);
  const [storeViews, setStoreViews]     = useState(0);
  const [productViews, setProductViews] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [epName, setEpName]   = useState("");
  const [epPrice, setEpPrice] = useState("");
  const [epDesc, setEpDesc]   = useState("");
  const [epStock, setEpStock] = useState("available");
  const [epSaving, setEpSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data: sellerRow, error: sellerErr } = await supabase
        .from("sellers")
        .select("id, user_id, name, business_name, slug, category, city, whatsapp_number, is_verified, is_blocked, verification_status, created_at, rejection_reason")
        .eq("id", id)
        .single();
      if (sellerErr) throw sellerErr;
      setSeller(sellerRow);

      const [{ data: productRows }, { data: clickRows }, { data: viewRows }, { data: warningRows }, { data: noteRow }, { data: auditRows }] = await Promise.all([
        supabase.from("products").select("id, name, price, status, is_featured, image_url, description, stock_status, created_at, price_updated_at").eq("seller_id", id).order("created_at", { ascending: false }),
        supabase.from("whatsapp_clicks").select("product_id").eq("seller_id", id),
        supabase.from("page_views").select("target_type, target_id").eq("seller_id", id),
        supabase.from("seller_warnings").select("id, reason, created_at").eq("seller_id", id).order("created_at", { ascending: false }),
        supabase.from("seller_admin_notes").select("note").eq("seller_id", id).maybeSingle(),
        supabase.from("admin_audit_log").select("id, action, created_at, metadata").eq("target_type", "seller").eq("target_id", id).order("created_at", { ascending: false }).limit(20),
      ]);

      const clicksByProduct = new Map<string, number>();
      (clickRows ?? []).forEach((c) => {
        const key = c.product_id ?? "__store__";
        clicksByProduct.set(key, (clicksByProduct.get(key) ?? 0) + 1);
      });
      const viewsByProduct = new Map<string, number>();
      let storeViewCount = 0, productViewCount = 0;
      (viewRows ?? []).forEach((v) => {
        if (v.target_type === "store") { storeViewCount++; return; }
        productViewCount++;
        viewsByProduct.set(v.target_id, (viewsByProduct.get(v.target_id) ?? 0) + 1);
      });
      setStoreViews(storeViewCount);
      setProductViews(productViewCount);

      const enrichedProducts: Product[] = (productRows ?? []).map((p) => ({
        ...p,
        clicks: clicksByProduct.get(p.id) ?? 0,
        views: viewsByProduct.get(p.id) ?? 0,
      }));
      setProducts(enrichedProducts);
      setWarnings(warningRows ?? []);
      setNote(noteRow?.note ?? "");

      // Merge admin actions with real product create/edit timestamps into
      // one activity feed. No login events — that data doesn't exist.
      const merged: ActivityItem[] = [];
      (auditRows ?? []).forEach((a) => {
        merged.push({ id: a.id, label: a.action.replace(/[._]/g, " "), created_at: a.created_at });
      });
      (productRows ?? []).forEach((p) => {
        merged.push({ id: `${p.id}-created`, label: "Added product", detail: p.name, created_at: p.created_at });
        if (p.price_updated_at && p.price_updated_at !== p.created_at) {
          merged.push({ id: `${p.id}-priced`, label: "Updated price", detail: p.name, created_at: p.price_updated_at });
        }
      });
      merged.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setActivity(merged.slice(0, 20));

      // Email + last login — server-side, service-role only.
      try {
        const info = await getVendorAuthInfo({ data: { sellerId: id } });
        setAuthInfo(info);
        setAuthInfoError(null);
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        console.warn("[vendor-detail] auth info fetch failed:", e);
        setAuthInfo(null);
        setAuthInfoError(msg);
      }
    } catch (e) {
      console.error(e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (allowed) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [allowed, id]);

  if (!isReady || !allowed) return <PageLoader label="Checking access…" />;
  if (loading) return <PageLoader label="Loading vendor…" />;
  if (loadError || !seller) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-2xl px-5 py-16 text-center">
          <BackButton fallback="/admin" />
          <AlertCircle className="mx-auto mt-6 h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm text-muted-foreground">Couldn't load this vendor.</p>
          <Button onClick={load} size="sm" className="mt-4 rounded-full">Retry</Button>
        </div>
      </div>
    );
  }

  const status = accountStatus(seller);
  const totalClicks = products.reduce((sum, p) => sum + p.clicks, 0);
  const featuredCount = products.filter((p) => p.is_featured).length;
  const mostViewed = [...products].sort((a, b) => b.views - a.views)[0];
  const bestCategory = (() => {
    const byCat = new Map<string, number>();
    products.forEach((p) => byCat.set(seller.category, (byCat.get(seller.category) ?? 0) + p.clicks));
    return seller.category;
  })();
  const clickRate = productViews > 0 ? ((totalClicks / productViews) * 100).toFixed(1) + "%" : "—";

  // ── Verification / block (same direct-update pattern as the main admin
  //    page — RLS + the prevent_self_verify trigger already enforce
  //    admin-only server-side, this isn't relying on the UI to gate it) ──
  const toggleVerify = async () => {
    const { error } = await supabase.from("sellers").update({ is_verified: !seller.is_verified }).eq("id", seller.id);
    if (error) { toast.error(error.message); return; }
    setSeller({ ...seller, is_verified: !seller.is_verified });
    toast.success(!seller.is_verified ? "Badge granted" : "Badge removed");
  };

  const toggleSuspend = async () => {
    const next = !seller.is_blocked;
    if (next && !confirm(`Suspend ${seller.business_name}? Their storefront will stop showing publicly.`)) return;
    const { error } = await supabase.from("sellers").update({ is_blocked: next }).eq("id", seller.id);
    if (error) { toast.error(error.message); return; }
    setSeller({ ...seller, is_blocked: next });
    toast.success(next ? "Vendor suspended" : "Vendor reinstated");
  };

  const addWarning = async () => {
    const reason = prompt("Reason for this warning (optional):") ?? "";
    const { data, error } = await supabase.from("seller_warnings").insert({ seller_id: seller.id, reason: reason || null, created_by: user!.id }).select().single();
    if (error) { toast.error(error.message); return; }
    setWarnings([data, ...warnings]);
    toast.success(`Warning added (${warnings.length + 1}/3)`);
  };

  const removeWarning = async () => {
    if (warnings.length === 0) return;
    const latest = warnings[0];
    const { error } = await supabase.from("seller_warnings").delete().eq("id", latest.id);
    if (error) { toast.error(error.message); return; }
    setWarnings(warnings.slice(1));
    toast.success("Most recent warning removed");
  };

  const saveNote = async () => {
    setNoteSaving(true);
    const { error } = await supabase.from("seller_admin_notes").upsert({ seller_id: seller.id, note, updated_by: user!.id, updated_at: new Date().toISOString() });
    setNoteSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Note saved");
  };

  const toggleProductStatus = async (p: Product) => {
    const next = p.status === "blocked" ? "active" : "blocked";
    const { error } = await supabase.from("products").update({ status: next, blocked_at: next === "blocked" ? new Date().toISOString() : null }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setProducts(products.map((x) => x.id === p.id ? { ...x, status: next } : x));
  };

  const toggleProductFeatured = async (p: Product) => {
    const { error } = await supabase.from("products").update({ is_featured: !p.is_featured }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setProducts(products.map((x) => x.id === p.id ? { ...x, is_featured: !p.is_featured } : x));
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    setProducts(products.filter((x) => x.id !== p.id));
    toast.success("Product deleted");
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setEpName(p.name);
    setEpPrice(p.price?.toString() ?? "");
    setEpDesc(p.description ?? "");
    setEpStock(p.stock_status);
  };

  const saveEdit = async () => {
    if (!editingProduct) return;
    setEpSaving(true);
    const { error } = await supabase.from("products").update({
      name: epName.trim(),
      price: epPrice ? Number(epPrice) : null,
      description: epDesc.trim() || null,
      stock_status: epStock,
      price_updated_at: new Date().toISOString(),
    }).eq("id", editingProduct.id);
    setEpSaving(false);
    if (error) { toast.error(error.message); return; }
    setProducts(products.map((x) => x.id === editingProduct.id
      ? { ...x, name: epName.trim(), price: epPrice ? Number(epPrice) : null, description: epDesc.trim() || null, stock_status: epStock }
      : x));
    setEditingProduct(null);
    toast.success("Product updated");
  };

  const phoneDigits = normaliseNigerianPhone(seller.whatsapp_number) ?? seller.whatsapp_number;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-3xl px-5 py-8">
        <BackButton fallback="/admin" />

        {/* ── Header ── */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl">{seller.business_name}</h1>
          {seller.is_verified && <VerifiedBadge className="h-5 w-5" />}
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>{status.label}</span>
          {warnings.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              Warnings: {warnings.length}/3
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          <Link to="/store/$slug" params={{ slug: seller.slug }} className="underline hover:text-primary">View public storefront →</Link>
        </p>

        {/* ── A. Basic information ── */}
        <section className="mt-6 rounded-2xl border bg-card p-4 shadow-warm">
          <h2 className="mb-3 font-serif text-lg">Basic Information</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-muted-foreground">Full name</dt><dd className="font-medium">{seller.name}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Business name</dt><dd className="font-medium">{seller.business_name}</dd></div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="font-medium">{authInfo?.email ?? <span className="italic text-muted-foreground">Unavailable</span>}</dd>
            </div>
            <div><dt className="text-xs text-muted-foreground">Phone</dt><dd className="font-medium">{seller.whatsapp_number}</dd></div>
            <div><dt className="text-xs text-muted-foreground">City of business</dt><dd className="font-medium">{seller.city}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Date joined</dt><dd className="font-medium">{new Date(seller.created_at).toLocaleDateString()}</dd></div>
            <div>
              <dt className="text-xs text-muted-foreground">Last login</dt>
              <dd className="font-medium">{authInfo?.lastSignInAt ? new Date(authInfo.lastSignInAt).toLocaleString() : <span className="italic text-muted-foreground">Never / unavailable</span>}</dd>
            </div>
            {seller.rejection_reason && (
              <div className="sm:col-span-2"><dt className="text-xs text-rose-600">Rejection reason</dt><dd className="text-rose-700">{seller.rejection_reason}</dd></div>
            )}
          </dl>
        </section>

        {/* ── C. Contact actions ── */}
        <section className="mt-4 flex flex-wrap gap-2">
          <a href={buildWhatsAppUrl(seller.whatsapp_number)} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-200">
            <MessageCircle className="h-4 w-4" /> Open WhatsApp
          </a>
          {authInfo?.email && (
            <a href={`mailto:${authInfo.email}`}
               className="flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-2 text-sm font-medium hover:bg-muted/70">
              <Mail className="h-4 w-4" /> Send email
            </a>
          )}
          <button
            onClick={() => { navigator.clipboard.writeText(seller.whatsapp_number); toast.success("Phone number copied"); }}
            className="flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-2 text-sm font-medium hover:bg-muted/70">
            <Copy className="h-4 w-4" /> Copy phone
          </button>
          <a href={`tel:+${phoneDigits}`} className="flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-2 text-sm font-medium hover:bg-muted/70">
            <Phone className="h-4 w-4" /> Call
          </a>
        </section>

        {/* ── B. Performance ── */}
        <section className="mt-6">
          <h2 className="mb-3 font-serif text-lg">Performance</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard icon={Package} label="Total products" value={products.length} />
            <StatCard icon={Eye} label="Store views" value={storeViews} />
            <StatCard icon={Eye} label="Product views" value={productViews} />
            <StatCard icon={MousePointerClick} label="WhatsApp clicks" value={totalClicks} />
            <StatCard icon={Star} label="Featured products" value={featuredCount} />
            <StatCard icon={TrendingUp} label="Click rate" value={clickRate} />
          </div>
        </section>

        {/* ── F. Analytics ── */}
        <section className="mt-6 rounded-2xl border bg-card p-4 shadow-warm">
          <h2 className="mb-3 font-serif text-lg">Analytics</h2>
          <div className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Most viewed product:</span> <span className="font-medium">{mostViewed && mostViewed.views > 0 ? `${mostViewed.name} (${mostViewed.views} views)` : "No view data yet"}</span></p>
            <p><span className="text-muted-foreground">Best performing category:</span> <span className="font-medium">{totalClicks > 0 ? bestCategory : "No click data yet"}</span></p>
            <p><span className="text-muted-foreground">Avg. WhatsApp click rate:</span> <span className="font-medium">{clickRate}</span> <span className="text-xs text-muted-foreground">(clicks ÷ product views)</span></p>
          </div>
        </section>

        {/* ── G. Verification ── */}
        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-warm">
          <div>
            <h2 className="font-serif text-lg">Verification</h2>
            <p className="text-xs text-muted-foreground">{seller.is_verified ? "This vendor has the verified badge." : "Not yet verified."}</p>
          </div>
          <Button onClick={toggleVerify} size="sm" variant={seller.is_verified ? "outline" : "default"} className="rounded-full">
            {seller.is_verified ? "Revoke badge" : "Grant badge"}
          </Button>
        </section>

        {/* ── I. Warnings + suspend ── */}
        <section className="mt-6 rounded-2xl border bg-card p-4 shadow-warm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg">Warnings: {warnings.length} / 3</h2>
              <p className="text-xs text-muted-foreground">Admin-only — never shown to the vendor.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={addWarning} size="sm" variant="outline" className="rounded-full">Add warning</Button>
              <Button onClick={removeWarning} size="sm" variant="outline" className="rounded-full" disabled={warnings.length === 0}>Remove warning</Button>
              <Button onClick={toggleSuspend} size="sm" className={`rounded-full ${seller.is_blocked ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"}`}>
                {seller.is_blocked ? <><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Reinstate</> : <><ShieldOff className="mr-1 h-3.5 w-3.5" /> Suspend</>}
              </Button>
            </div>
          </div>
          {warnings.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t pt-3 text-sm">
              {warnings.map((w) => (
                <li key={w.id} className="flex justify-between gap-3 text-muted-foreground">
                  <span>{w.reason || <span className="italic">No reason given</span>}</span>
                  <span className="shrink-0 text-xs">{new Date(w.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── H. Admin notes ── */}
        <section className="mt-6 rounded-2xl border bg-card p-4 shadow-warm">
          <h2 className="mb-2 font-serif text-lg">Admin Notes</h2>
          <p className="mb-2 text-xs text-muted-foreground">Private — internal comments only, never visible to the vendor.</p>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Internal notes about this vendor…" className="rounded-xl" />
          <Button onClick={saveNote} disabled={noteSaving} size="sm" className="mt-2 rounded-full">
            {noteSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="ml-1">Save note</span>
          </Button>
        </section>

        {/* ── D. Products ── */}
        <section className="mt-6">
          <h2 className="mb-3 font-serif text-lg">Products ({products.length})</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products yet.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className={`flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-warm sm:flex-row sm:items-center ${p.status === "blocked" ? "border-destructive/30 opacity-60" : ""}`}>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}{p.is_featured && <span className="ml-1.5 text-amber-500">★</span>}</p>
                    <p className="text-xs text-muted-foreground">
                      ₦{Number(p.price ?? 0).toLocaleString()} · {p.views} views · {p.clicks} clicks · {new Date(p.created_at).toLocaleDateString()}
                      {p.status === "blocked" && <span className="ml-2 text-destructive">● hidden</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1 border-t pt-2 sm:border-t-0 sm:pt-0">
                    <button onClick={() => openEdit(p)} className="rounded p-1.5 hover:bg-muted" title="Edit"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => toggleProductFeatured(p)} className="rounded p-1.5 hover:bg-muted" title={p.is_featured ? "Unfeature" : "Feature"}>
                      {p.is_featured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    </button>
                    <button onClick={() => toggleProductStatus(p)} className="rounded p-1.5 hover:bg-muted" title={p.status === "blocked" ? "Unhide" : "Hide"}>
                      {p.status === "blocked" ? <Eye className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => deleteProduct(p)} className="rounded p-1.5 text-destructive hover:bg-destructive/10" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── E. Vendor activity ── */}
        <section className="mt-6 pb-10">
          <h2 className="mb-3 font-serif text-lg">Vendor Activity</h2>
          <p className="mb-2 text-xs text-muted-foreground">Admin actions on this vendor, plus product add/edit events. Login history isn't tracked yet.</p>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2 text-sm">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 min-w-0 truncate capitalize">{a.label}{a.detail ? `: ${a.detail}` : ""}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Edit product dialog ── */}
      <Dialog open={!!editingProduct} onOpenChange={(o) => !o && setEditingProduct(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Edit product</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={epName} onChange={(e) => setEpName(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <Label>Price (₦)</Label>
              <Input type="number" value={epPrice} onChange={(e) => setEpPrice(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <Label>Stock status</Label>
              <Select value={epStock} onValueChange={setEpStock}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="out_of_stock">Out of stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={epDesc} onChange={(e) => setEpDesc(e.target.value)} rows={3} className="rounded-xl" />
            </div>
            <Button onClick={saveEdit} disabled={epSaving || !epName.trim()} className="w-full rounded-full">
              {epSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
