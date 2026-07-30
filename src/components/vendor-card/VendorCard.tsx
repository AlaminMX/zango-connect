import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Heart, MapPin, Phone, ShoppingBag, Sparkles, Star } from "lucide-react";

import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import { getVendorStoreUrl, resolveVendorCardTheme, vendorCardFormats } from "@/lib/vendor-card/themes";
import type { VendorCardProps, VendorCardProduct } from "@/lib/vendor-card/types";

function productImage(product?: VendorCardProduct) {
  return product?.image_urls?.[0] || product?.image_url || null;
}

function formatDate(value?: string | null) {
  if (!value) return "New seller";
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(value));
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export const VendorCard = React.forwardRef<HTMLDivElement, VendorCardProps>(
  ({ vendor, products = [], theme, format = "instagram-portrait", className }, ref) => {
    const resolvedTheme = resolveVendorCardTheme(vendor.category, theme);
    const dimensions = vendorCardFormats[format];
    const storeUrl = getVendorStoreUrl(vendor.slug);
    const featured = products.filter((product) => productImage(product)).slice(0, 5);
    const productCategories = [vendor.category, ...products.slice(0, 3).map((product) => product.name)].filter(Boolean).slice(0, 4);
    const isTall = dimensions.height / dimensions.width > 1.45;
    const isCompact = dimensions.height <= 700;

    return (
      <div
        ref={ref}
        className={cn("relative isolate overflow-hidden bg-[#FCF9F5] text-[#3E2723] shadow-2xl", className)}
        style={{ width: dimensions.width, height: dimensions.height, borderRadius: isCompact ? 34 : 40 }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(232,200,184,.9),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(138,154,91,.16),transparent_32%),linear-gradient(135deg,#FCF9F5_0%,#F6EFE7_52%,#EFE1D5_100%)]" />
        <div className="absolute -left-24 bottom-16 h-80 w-80 rounded-full bg-white/50 blur-3xl" />
        <div className="absolute right-6 top-8 text-[140px] font-black tracking-[-.12em] text-white/35">{resolvedTheme.motif}</div>

        <div className={cn("relative grid h-full gap-0 p-10", isTall ? "grid-rows-[42%_58%]" : "grid-cols-[40%_60%]")}> 
          <section className={cn("z-10 flex flex-col rounded-[34px] border border-white/70 bg-[#FFFCF8]/88 p-8 shadow-[0_30px_90px_rgba(62,39,35,.14)] backdrop-blur-xl", isCompact && "p-6")}> 
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-black text-[#FCF9F5] shadow-lg" style={{ backgroundColor: resolvedTheme.accent }}>Z</div>
              <div>
                <p className="font-display text-2xl leading-none tracking-tight">ZANGO</p>
                <p className="text-[11px] uppercase tracking-[.24em] text-[#7A6B5D]">Discover. Support. Empower.</p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-[28px] border-4 border-white bg-[#F2EDE7] shadow-xl">
                {vendor.profile_photo_url ? <img src={vendor.profile_photo_url} alt={vendor.business_name} className="h-full w-full object-cover" crossOrigin="anonymous" /> : <div className="grid h-full w-full place-items-center font-display text-4xl" style={{ color: resolvedTheme.accent }}>{initials(vendor.business_name)}</div>}
              </div>
              <div className="min-w-0">
                <p className="inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[.18em] text-white" style={{ backgroundColor: resolvedTheme.accent }}>{vendor.category || resolvedTheme.badge}</p>
                <h1 className="mt-3 flex items-center gap-2 font-display text-5xl leading-[.88] tracking-[-.04em] text-[#3E2723]">
                  {vendor.business_name}
                  {vendor.is_verified && <VerifiedBadge className="h-8 w-8 shrink-0" />}
                </h1>
              </div>
            </div>

            <p className="mt-5 max-w-sm font-serif text-2xl italic leading-snug text-[#7A4E3F]">{vendor.bio || `A curated ${vendor.category || "marketplace"} store for beautiful everyday finds.`}</p>
            <div className="my-6 h-px bg-gradient-to-r from-transparent via-[#C05A3F]/35 to-transparent" />

            <div className="grid gap-3 text-sm text-[#5A4038]">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4" style={{ color: resolvedTheme.accent }} /> {vendor.city || "Nigeria"}</p>
              {vendor.whatsapp_number ? <p className="flex items-center gap-2"><Phone className="h-4 w-4" style={{ color: resolvedTheme.accent }} /> {vendor.whatsapp_number}</p> : null}
              <p className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" style={{ color: resolvedTheme.accent }} /> {products.length} product{products.length === 1 ? "" : "s"}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {productCategories.map((item) => <span key={item} className="rounded-full border border-[#E5D5C5] bg-white/65 px-3 py-1 text-[11px] font-semibold text-[#7A6B5D]">{item}</span>)}
            </div>

            <div className="mt-auto grid grid-cols-3 gap-2 pt-5">
              <Metric icon={<CheckCircle2 className="h-4 w-4" />} label={vendor.is_verified ? "Verified" : "Trusted"} />
              <Metric icon={<Star className="h-4 w-4 fill-current" />} label={`${vendor.rating?.toFixed?.(1) ?? "5.0"} rating`} />
              <Metric icon={<Sparkles className="h-4 w-4" />} label={`Since ${formatDate(vendor.created_at)}`} />
            </div>
          </section>

          <section className={cn("relative overflow-hidden rounded-[38px] border border-white/60 shadow-[0_40px_120px_rgba(62,39,35,.18)]", isTall ? "-mt-6" : "-ml-6")}> 
            <div className={cn("absolute inset-0 bg-gradient-to-br", resolvedTheme.heroGradient)} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,.7),transparent_22%),radial-gradient(circle_at_75%_70%,rgba(62,39,35,.34),transparent_38%)]" />
            {vendor.cover_photo_url ? <img src={vendor.cover_photo_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55 mix-blend-luminosity" crossOrigin="anonymous" /> : null}

            <div className="relative grid h-full grid-cols-12 grid-rows-12 gap-4 p-8">
              {featured.length > 0 ? featured.map((product, index) => (
                <ProductTile key={product.id} product={product} index={index} accent={resolvedTheme.accent} />
              )) : <LifestyleFallback themeLabel={resolvedTheme.lifestylePrompt} accent={resolvedTheme.accent} />}
            </div>
          </section>
        </div>

        <div className="absolute inset-x-10 bottom-9 z-20 rounded-[30px] border border-white/70 bg-white/62 p-5 shadow-[0_24px_90px_rgba(62,39,35,.22)] backdrop-blur-2xl animate-[float_6s_ease-in-out_infinite]">
          <div className="flex items-center gap-5">
            <div className="rounded-3xl bg-white p-3 shadow-lg"><QRCodeSVG value={storeUrl} size={isCompact ? 92 : 132} bgColor="#FFFFFF" fgColor="#3E2723" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[.28em]" style={{ color: resolvedTheme.accent }}>Visit My Store</p>
              <p className="mt-1 truncate font-display text-3xl tracking-[-.03em] text-[#3E2723]">{storeUrl.replace("https://", "")}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#6F5C51]">Scan to explore my products and shop with confidence.</p>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-12 bottom-2 z-20 flex items-center justify-between text-[12px] font-semibold uppercase tracking-[.16em] text-[#7A6B5D]">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> Shop Local</span>
          <span>✓ Trusted Seller</span>
          <span>★ Empowering Businesses</span>
          <span className="font-black text-[#3E2723]">Powered by Zango</span>
        </div>
      </div>
    );
  },
);
VendorCard.displayName = "VendorCard";

function Metric({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="rounded-2xl border border-white/70 bg-white/55 p-3 text-center text-[11px] font-bold text-[#5A4038] shadow-sm"><div className="mx-auto mb-1 grid place-items-center text-[#C05A3F]">{icon}</div>{label}</div>;
}

function ProductTile({ product, index, accent }: { product: VendorCardProduct; index: number; accent: string }) {
  const positions = ["col-span-7 row-span-7", "col-span-5 row-span-5 col-start-8", "col-span-4 row-span-4 col-start-8 row-start-6", "col-span-5 row-span-4 row-start-8", "col-span-3 row-span-3 col-start-6 row-start-9"];
  return (
    <div className={cn("group relative overflow-hidden rounded-[30px] border border-white/70 bg-white/45 p-3 shadow-[0_24px_70px_rgba(62,39,35,.22)] backdrop-blur-xl", positions[index] ?? positions[0])}>
      <div className="absolute inset-3 rounded-[24px] bg-white/35" />
      <img src={productImage(product) ?? ""} alt={product.name} className="relative h-full w-full rounded-[24px] object-cover drop-shadow-2xl transition-transform duration-700 group-hover:scale-105" crossOrigin="anonymous" loading="lazy" />
      <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-white/70 px-3 py-2 text-xs font-bold text-[#3E2723] backdrop-blur">
        <span className="line-clamp-1">{product.name}</span>
        {product.price ? <span style={{ color: accent }}>₦{Number(product.price).toLocaleString()}</span> : null}
      </div>
    </div>
  );
}

function LifestyleFallback({ themeLabel, accent }: { themeLabel: string; accent: string }) {
  return (
    <div className="col-span-12 row-span-12 grid place-items-center rounded-[34px] border border-white/70 bg-white/35 p-10 text-center shadow-inner backdrop-blur-xl">
      <div>
        <div className="mx-auto grid h-32 w-32 place-items-center rounded-[40px] bg-white/70 shadow-2xl"><ShoppingBag className="h-16 w-16" style={{ color: accent }} /></div>
        <p className="mt-8 font-display text-6xl leading-none tracking-[-.06em] text-white drop-shadow-lg">Premium marketplace edit</p>
        <p className="mx-auto mt-4 max-w-lg text-lg font-medium text-white/90">{themeLabel}</p>
      </div>
    </div>
  );
}
