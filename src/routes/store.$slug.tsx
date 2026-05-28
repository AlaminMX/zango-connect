import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { buildWhatsAppUrl, trackClick } from "@/lib/whatsapp";
import { BadgeCheck, MapPin, MessageCircle, Share2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/store/$slug")({ component: StorePage });

function StorePage() {
  const { slug } = Route.useParams();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [mySellerId, setMySellerId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({ id: data.user.id });
        supabase.from("sellers").select("id").eq("user_id", data.user.id).maybeSingle()
          .then(({ data: s }) => setMySellerId(s?.id ?? null));
      }
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

  const { data: products } = useQuery({
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

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading…</div>;
  if (!seller) return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="p-10 text-center">
        <p className="font-serif text-2xl">Store not found</p>
        <Link to="/" className="mt-3 inline-block text-sm text-primary underline">Go home</Link>
      </div>
    </div>
  );

  const completeness = [seller.profile_photo_url, seller.cover_photo_url, seller.bio, (products?.length ?? 0) > 0].filter(Boolean).length * 25;
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/store/${seller.slug}` : "";

  const handleShare = async () => {
    const text = `Check out my store on Sutura Market 🛍️ ${shareUrl}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch {}
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleVouch = async () => {
    if (!user || !mySellerId) { toast.error("Sign in as a seller to vouch"); return; }
    if (mySellerId === seller.id) { toast.error("You can't vouch for yourself"); return; }
    const { error } = await supabase.from("vouches").insert({ voucher_seller_id: mySellerId, vouched_seller_id: seller.id });
    if (error) toast.error(error.message.includes("duplicate") ? "Already vouched" : error.message);
    else toast.success("Vouched! Thank you 💛");
  };

  const waUrl = buildWhatsAppUrl(seller.whatsapp_number);

  return (
    <div className="min-h-screen bg-background pb-24">
      <TopBar />

      {/* Cover */}
      <div className="relative h-44 bg-gradient-to-br from-secondary via-rose to-primary/30 sm:h-56">
        {seller.cover_photo_url && <img src={seller.cover_photo_url} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="mx-auto max-w-3xl px-5">
        <div className="-mt-12 flex items-end gap-4">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-background bg-secondary shadow-warm-lg">
            {seller.profile_photo_url ? (
              <img src={seller.profile_photo_url} alt={seller.business_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-serif text-3xl text-primary">
                {seller.business_name.charAt(0)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-start gap-2">
            <h1 className="font-serif text-3xl leading-tight">{seller.business_name}</h1>
            {seller.is_verified && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <BadgeCheck className="mt-1 h-6 w-6 text-primary" />
                  </TooltipTrigger>
                  <TooltipContent>Vouched for by {vouchCount ?? 2}+ sellers in this community</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {seller.bio && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{seller.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">{seller.category}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-muted-foreground">
              <MapPin className="h-3 w-3" />{seller.city}
            </span>
          </div>

          {/* Completeness bar */}
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>Profile completeness</span><span>{completeness}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completeness}%` }} />
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <Button onClick={handleShare} variant="outline" className="flex-1 rounded-full">
              <Share2 className="mr-1.5 h-4 w-4" /> Share My Store
            </Button>
            {user && mySellerId && mySellerId !== seller.id && (
              <Button onClick={handleVouch} variant="outline" className="rounded-full">
                <Heart className="mr-1.5 h-4 w-4" /> Vouch
              </Button>
            )}
          </div>
        </div>

        {/* Products */}
        <h2 className="mt-10 mb-4 font-serif text-2xl">Products</h2>
        {products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price={Number(p.price)}
                image_url={p.image_url}
                stock_status={(p as any).stock_status}
                seller_id={seller.id}
                whatsapp_number={seller.whatsapp_number}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No products yet.</div>
        )}
      </div>

      {/* Sticky WhatsApp CTA */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick(seller.id)}
        className="fixed bottom-4 left-1/2 z-30 flex w-[min(92%,420px)] -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-[var(--color-whatsapp)] px-6 py-3.5 font-medium text-[var(--color-whatsapp-foreground)] shadow-warm-lg transition hover:opacity-95"
      >
        <MessageCircle className="h-5 w-5" /> Order on WhatsApp
      </a>

      <Footer />
    </div>
  );
}
