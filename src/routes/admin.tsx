import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { MoreHorizontal, ShieldAlert, ShieldCheck, Trash2, Send, Eye } from "lucide-react";
import {
  setSellerStatus, deleteSeller, setProductStatus, deleteProduct, sendNotice,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({ component: AdminPage });

interface SellerRow {
  id: string; business_name: string; slug: string; category: string; city: string;
  is_verified: boolean; status: string; subscription_expires_at: string | null;
  created_at: string; user_id: string;
}
interface ProductRow {
  id: string; name: string; price: number; image_url: string | null;
  status: string; seller_id: string; created_at: string;
  sellers?: { business_name: string; slug: string } | null;
}
interface NoticeRow {
  id: string; title: string; severity: string; created_at: string; read_at: string | null;
  seller_id: string;
}
interface AuditRow {
  id: string; admin_id: string | null; action: string; target_type: string;
  target_id: string | null; created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  blocked: "bg-destructive/15 text-destructive",
  suspended: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  expired: "bg-muted text-muted-foreground",
};

function StatusBadge({ s }: { s: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${STATUS_BADGE[s] ?? "bg-muted"}`}>{s}</span>;
}

function AdminPage() {
  const nav = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [sellers, setSellers] = useState<SellerRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({ sellers: 0, products: 0, clicks: 0 });

  // Dialog state
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; desc: string; onYes: () => void } | null>(null);
  const [noticeFor, setNoticeFor] = useState<SellerRow | null>(null);
  const [nTitle, setNTitle] = useState(""); const [nMsg, setNMsg] = useState("");
  const [nSeverity, setNSeverity] = useState<"info" | "warning" | "critical">("info");

  const fnSetSellerStatus = useServerFn(setSellerStatus);
  const fnDeleteSeller = useServerFn(deleteSeller);
  const fnSetProductStatus = useServerFn(setProductStatus);
  const fnDeleteProduct = useServerFn(deleteProduct);
  const fnSendNotice = useServerFn(sendNotice);

  const loadAll = useCallback(async () => {
    const [{ data: sl }, { data: pr }, { data: no }, { data: au }, { count: pc }, { count: cc }] = await Promise.all([
      supabase.from("sellers").select("id, business_name, slug, category, city, is_verified, status, subscription_expires_at, created_at, user_id").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, price, image_url, status, seller_id, created_at, sellers(business_name, slug)").order("created_at", { ascending: false }).limit(200),
      supabase.from("seller_notices").select("id, title, severity, created_at, read_at, seller_id").order("created_at", { ascending: false }).limit(100),
      supabase.from("admin_audit_log").select("id, admin_id, action, target_type, target_id, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("whatsapp_clicks").select("id", { count: "exact", head: true }),
    ]);
    setSellers((sl ?? []) as SellerRow[]);
    setProducts((pr ?? []) as ProductRow[]);
    setNotices((no ?? []) as NoticeRow[]);
    setAudit((au ?? []) as AuditRow[]);
    setStats({ sellers: sl?.length ?? 0, products: pc ?? 0, clicks: cc ?? 0 });
    const counts: Record<string, number> = {};
    (pr ?? []).forEach((p: any) => { counts[p.seller_id] = (counts[p.seller_id] ?? 0) + 1; });
    setProductCounts(counts);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { nav({ to: "/auth" }); return; }
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!role) { nav({ to: "/dashboard" }); return; }
      setAllowed(true);
      await loadAll();
    })();
  }, [nav, loadAll]);

  const runStatus = async (sellerId: string, status: "active" | "blocked" | "suspended" | "expired") => {
    try { await fnSetSellerStatus({ data: { sellerId, status } }); toast.success(`Seller ${status}`); await loadAll(); }
    catch (e: any) { toast.error(e.message); }
  };
  const runDeleteSeller = async (sellerId: string) => {
    try { await fnDeleteSeller({ data: { sellerId } }); toast.success("Seller deleted"); await loadAll(); }
    catch (e: any) { toast.error(e.message); }
  };
  const runProductStatus = async (productId: string, status: "active" | "blocked") => {
    try { await fnSetProductStatus({ data: { productId, status } }); toast.success(`Product ${status}`); await loadAll(); }
    catch (e: any) { toast.error(e.message); }
  };
  const runDeleteProduct = async (productId: string) => {
    try { await fnDeleteProduct({ data: { productId } }); toast.success("Product deleted"); await loadAll(); }
    catch (e: any) { toast.error(e.message); }
  };
  const submitNotice = async () => {
    if (!noticeFor) return;
    if (!nTitle.trim() || !nMsg.trim()) { toast.error("Title and message required"); return; }
    try {
      await fnSendNotice({ data: { sellerId: noticeFor.id, title: nTitle.trim(), message: nMsg.trim(), severity: nSeverity } });
      toast.success("Notice sent");
      setNoticeFor(null); setNTitle(""); setNMsg(""); setNSeverity("info");
      await loadAll();
    } catch (e: any) { toast.error(e.message); }
  };

  if (allowed === null) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-6xl px-5 py-8">
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

        <Tabs defaultValue="sellers" className="mt-8">
          <TabsList>
            <TabsTrigger value="sellers">Sellers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="notices">Notices</TabsTrigger>
            <TabsTrigger value="audit">Audit log</TabsTrigger>
          </TabsList>

          <TabsContent value="sellers" className="mt-4 space-y-2">
            {sellers.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-warm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link to="/store/$slug" params={{ slug: s.slug }} className="truncate font-medium hover:text-primary">{s.business_name}</Link>
                    <StatusBadge s={s.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.category} · {s.city} · {productCounts[s.id] ?? 0} products
                    {s.subscription_expires_at ? ` · expires ${new Date(s.subscription_expires_at).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild><Link to="/store/$slug" params={{ slug: s.slug }}><Eye className="mr-2 h-4 w-4" /> View store</Link></DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setNoticeFor(s)}><Send className="mr-2 h-4 w-4" /> Send notice</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {s.status !== "active" && <DropdownMenuItem onClick={() => runStatus(s.id, "active")}><ShieldCheck className="mr-2 h-4 w-4" /> Activate</DropdownMenuItem>}
                    {s.status !== "suspended" && <DropdownMenuItem onClick={() => runStatus(s.id, "suspended")}>Suspend</DropdownMenuItem>}
                    {s.status !== "expired" && <DropdownMenuItem onClick={() => runStatus(s.id, "expired")}>Mark expired</DropdownMenuItem>}
                    {s.status !== "blocked" && <DropdownMenuItem onClick={() => runStatus(s.id, "blocked")} className="text-destructive"><ShieldAlert className="mr-2 h-4 w-4" /> Block</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setConfirm({
                        open: true,
                        title: `Delete ${s.business_name}?`,
                        desc: `This will permanently remove the seller and ${productCounts[s.id] ?? 0} product(s). This action cannot be undone.`,
                        onYes: () => runDeleteSeller(s.id),
                      })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete seller
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {sellers.length === 0 && <p className="text-sm text-muted-foreground">No sellers yet.</p>}
          </TabsContent>

          <TabsContent value="products" className="mt-4 space-y-2">
            {products.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-warm">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {p.image_url && <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{p.name}</p>
                    <StatusBadge s={p.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ₦{Number(p.price).toLocaleString()} · {p.sellers?.business_name ?? "—"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {p.status === "blocked"
                      ? <DropdownMenuItem onClick={() => runProductStatus(p.id, "active")}><ShieldCheck className="mr-2 h-4 w-4" /> Unblock</DropdownMenuItem>
                      : <DropdownMenuItem onClick={() => runProductStatus(p.id, "blocked")} className="text-destructive"><ShieldAlert className="mr-2 h-4 w-4" /> Block</DropdownMenuItem>}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setConfirm({
                        open: true,
                        title: `Delete "${p.name}"?`,
                        desc: "This permanently removes the product. This action cannot be undone.",
                        onYes: () => runDeleteProduct(p.id),
                      })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete product
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {products.length === 0 && <p className="text-sm text-muted-foreground">No products yet.</p>}
          </TabsContent>

          <TabsContent value="notices" className="mt-4 space-y-2">
            {notices.map((n) => {
              const seller = sellers.find((s) => s.id === n.seller_id);
              return (
                <div key={n.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-warm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{n.title}</p>
                      <StatusBadge s={n.severity} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      To {seller?.business_name ?? "—"} · {new Date(n.created_at).toLocaleString()}
                      {n.read_at ? ` · Read ${new Date(n.read_at).toLocaleString()}` : " · Unread"}
                    </p>
                  </div>
                </div>
              );
            })}
            {notices.length === 0 && <p className="text-sm text-muted-foreground">No notices yet. Send one from the Sellers tab.</p>}
          </TabsContent>

          <TabsContent value="audit" className="mt-4 space-y-1">
            {audit.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm shadow-warm">
                <span className="font-mono text-xs">{a.action}</span>
                <span className="text-xs text-muted-foreground">{a.target_type} · {a.target_id?.slice(0, 8) ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
            {audit.length === 0 && <p className="text-sm text-muted-foreground">No actions logged yet.</p>}
          </TabsContent>
        </Tabs>

        <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); nav({ to: "/" }); }} className="mt-8">
          Sign out
        </Button>
      </div>

      <AlertDialog open={!!confirm?.open} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { confirm?.onYes(); setConfirm(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!noticeFor} onOpenChange={(o) => !o && setNoticeFor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send notice to {noticeFor?.business_name}</AlertDialogTitle>
            <AlertDialogDescription>Will appear at the top of the seller's dashboard.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Severity</Label>
              <Select value={nSeverity} onValueChange={(v) => setNSeverity(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Information</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Title</Label><Input value={nTitle} onChange={(e) => setNTitle(e.target.value)} maxLength={200} /></div>
            <div><Label>Message</Label><Textarea value={nMsg} onChange={(e) => setNMsg(e.target.value)} maxLength={2000} rows={5} /></div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitNotice}>Send notice</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
