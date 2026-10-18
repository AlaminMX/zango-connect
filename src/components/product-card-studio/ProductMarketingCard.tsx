import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Flame,
  CheckCircle2,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  productCardFormats,
  productCardThemes,
  resolveProductCardTheme,
  formatCardPhoneNumber,
  getProductStoreUrl,
} from "@/lib/product-card/themes";
import type {
  ProductCardFormat,
  ProductCardThemeName,
  ProductMarketingCardProduct,
  ProductMarketingCardSeller,
} from "@/lib/product-card/types";

interface ProductMarketingCardProps {
  product: ProductMarketingCardProduct;
  seller: ProductMarketingCardSeller;
  format?: ProductCardFormat;
  theme?: ProductCardThemeName;
  variation?: number; // 0, 1, 2 for regenerated layout styles
  showWhatsAppBadge?: boolean;
  showVerifiedBadge?: boolean;
  showStockBadge?: boolean;
  showQRCode?: boolean;
  customTagline?: string;
  className?: string;
}

/**
 * Northern Arewa Geometric Emblem SVG Component
 */
function ArewaKnotEmblem({ color = "#D4AF37", className }: { color?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("pointer-events-none select-none", className)}
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Central diamond */}
      <polygon points="50,15 85,50 50,85 15,50" strokeWidth="2.5" opacity="0.9" />
      {/* Inner interlaced diamond */}
      <polygon points="50,28 72,50 50,72 28,50" strokeWidth="2" opacity="0.6" />
      {/* North, East, South, West interlocking petal loops */}
      <circle cx="50" cy="18" r="10" strokeWidth="2" opacity="0.75" />
      <circle cx="82" cy="50" r="10" strokeWidth="2" opacity="0.75" />
      <circle cx="50" cy="82" r="10" strokeWidth="2" opacity="0.75" />
      <circle cx="18" cy="50" r="10" strokeWidth="2" opacity="0.75" />
      <circle cx="50" cy="50" r="6" fill={color} opacity="0.8" />
    </svg>
  );
}

/**
 * Kano Indigo / Northern Arch Filigree SVG
 */
function NorthernArchPattern({
  color = "#D4AF37",
  className,
}: {
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 60"
      className={cn("pointer-events-none select-none opacity-40", className)}
      fill="none"
      stroke={color}
      strokeWidth="1.5"
    >
      <path d="M 0,30 Q 50,0 100,30 T 200,30 T 300,30 T 400,30" />
      <path d="M 0,40 Q 50,10 100,40 T 200,40 T 300,40 T 400,40" strokeDasharray="3 3" />
    </svg>
  );
}

function formatPrice(price?: number | string | null): string {
  if (price == null || price === "") return "Price on request";
  const num = Number(price);
  if (isNaN(num) || num <= 0) return "Price on request";
  return `₦${num.toLocaleString()}`;
}

export const ProductMarketingCard = React.forwardRef<HTMLDivElement, ProductMarketingCardProps>(
  (
    {
      product,
      seller,
      format = "whatsapp-status",
      theme,
      variation = 0,
      showWhatsAppBadge = true,
      showVerifiedBadge = true,
      showStockBadge = true,
      showQRCode = true,
      customTagline,
      className,
    },
    ref,
  ) => {
    const dimensions = productCardFormats[format] || productCardFormats["whatsapp-status"];
    const resolvedTheme = resolveProductCardTheme(
      product.category || seller.category,
      theme,
      `${product.name} ${seller.business_name} ${seller.city || ""}`,
    );

    const productUrl = getProductStoreUrl(seller.slug, product.id);
    const formattedPhone = formatCardPhoneNumber(seller.whatsapp_number);
    const isVertical = format === "whatsapp-status" || format === "story";
    const isSquare = format === "square";
    const isLandscape = format === "landscape";

    const stockStatus = product.stock_status || "available";
    const isSoldOut = stockStatus === "sold_out";
    const isLowStock = stockStatus === "low_stock";

    const displayStockLabel = isSoldOut
      ? "Sold Out"
      : isLowStock
        ? "Selling Fast 🔥"
        : "In Stock & Ready";

    return (
      <div
        ref={ref}
        className={cn("relative overflow-hidden font-sans select-none", className)}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          background: resolvedTheme.bgGradient,
          color: resolvedTheme.textPrimary,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        {/* Northern Ambient Glow Overlays */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: resolvedTheme.glow }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-25 pointer-events-none"
          style={{ backgroundColor: resolvedTheme.borderAccent }}
        />

        {/* Traditional Northern Motif Background Accents */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <ArewaKnotEmblem
            color={resolvedTheme.borderAccent}
            className="absolute top-12 -right-16 w-80 h-80 rotate-12"
          />
          <ArewaKnotEmblem
            color={resolvedTheme.borderAccent}
            className="absolute bottom-24 -left-20 w-96 h-96 -rotate-12"
          />
        </div>

        {/* Fine Architectural Gold/Copper Accent Border */}
        <div
          className="absolute inset-4 rounded-[40px] pointer-events-none border"
          style={{
            borderColor: `${resolvedTheme.borderAccent}35`,
          }}
        />
        <div
          className="absolute inset-6 rounded-[32px] pointer-events-none border border-dashed"
          style={{
            borderColor: `${resolvedTheme.borderAccent}20`,
          }}
        />

        {/* ───────────────── HEADER: BRANDING & VERIFIED BADGES ───────────────── */}
        <header className="relative z-10 flex items-center justify-between px-10 pt-10 sm:px-12 sm:pt-12">
          {/* Marketplace Seal */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-2xl shadow-xl border border-white/20"
              style={{
                backgroundColor: resolvedTheme.accent,
                boxShadow: `0 8px 24px ${resolvedTheme.accent}40`,
              }}
            >
              <span className="font-serif text-2xl font-black text-white">Z</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-wider uppercase text-sm sm:text-base text-white">
                  ZANGO
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                  style={{
                    backgroundColor: `${resolvedTheme.accent}30`,
                    borderColor: resolvedTheme.borderAccent,
                    color: resolvedTheme.borderAccent,
                  }}
                >
                  Verified Market
                </span>
              </div>
              <p className="text-[11px] opacity-75 tracking-wide text-zinc-300">
                Northern Nigeria Premier Marketplace
              </p>
            </div>
          </div>

          {/* Northern Theme Capsule */}
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm backdrop-blur-md"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.45)",
              borderColor: `${resolvedTheme.borderAccent}60`,
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: resolvedTheme.borderAccent }} />
            <span
              className="text-xs font-semibold tracking-wider uppercase"
              style={{ color: resolvedTheme.borderAccent }}
            >
              {resolvedTheme.label}
            </span>
          </div>
        </header>

        {/* ───────────────── MAIN BODY BASED ON FORMAT ───────────────── */}
        {isVertical ? (
          /* ───────── 9:16 VERTICAL FORMAT (WhatsApp Status & Story) ───────── */
          <div className="relative z-10 flex flex-col justify-between h-[calc(100%-110px)] px-10 pb-10 sm:px-12 sm:pb-12 pt-6">
            {/* Top Product Hero Showcase */}
            <div className="relative flex flex-col items-center">
              {/* Product Frame Container */}
              <div
                className={cn(
                  "relative w-full overflow-hidden rounded-[36px] shadow-2xl border transition-all duration-300",
                  variation === 1
                    ? "border-[6px] shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                    : "border-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)]",
                )}
                style={{
                  height: "880px",
                  borderColor:
                    variation === 1
                      ? resolvedTheme.borderAccent
                      : `${resolvedTheme.borderAccent}50`,
                  backgroundColor: "#0D0B0A",
                }}
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-zinc-900 text-zinc-400 p-8 text-center">
                    <Package className="w-20 h-20 opacity-40 text-amber-500" />
                    <span className="text-xl font-medium">Verified Product Showcase</span>
                  </div>
                )}

                {/* Scrim Gradient at bottom of image */}
                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Overlaid Badges on Image */}
                <div className="absolute top-6 left-6 right-6 flex items-start justify-between gap-3">
                  {/* Stock Status Badge */}
                  {showStockBadge && (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg backdrop-blur-md border",
                        isSoldOut
                          ? "bg-zinc-800/90 text-zinc-300 border-zinc-600"
                          : isLowStock
                            ? "bg-amber-600/90 text-white border-amber-300 animate-pulse"
                            : "bg-emerald-600/90 text-white border-emerald-300",
                      )}
                    >
                      {isLowStock ? (
                        <Flame className="w-4 h-4 fill-white" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{displayStockLabel}</span>
                    </div>
                  )}

                  {/* High Clarity Price Tag */}
                  <div
                    className="flex flex-col items-end px-6 py-2.5 rounded-3xl shadow-2xl backdrop-blur-md border"
                    style={{
                      backgroundColor: "rgba(10, 10, 12, 0.88)",
                      borderColor: resolvedTheme.borderAccent,
                    }}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                      ZANGO PRICE
                    </span>
                    <span
                      className="font-serif text-3xl font-extrabold tracking-tight"
                      style={{ color: resolvedTheme.borderAccent }}
                    >
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </div>

                {/* Verified Vendor Pill Overlaid at bottom of image */}
                <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between">
                  <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15">
                    {seller.profile_photo_url ? (
                      <img
                        src={seller.profile_photo_url}
                        alt={seller.business_name}
                        crossOrigin="anonymous"
                        className="w-10 h-10 rounded-full object-cover border-2"
                        style={{ borderColor: resolvedTheme.borderAccent }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
                        style={{ backgroundColor: resolvedTheme.accent }}
                      >
                        {(seller.business_name || "Z").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-white truncate max-w-[200px]">
                          {seller.business_name || "Verified Vendor"}
                        </span>
                        {showVerifiedBadge && seller.is_verified && (
                          <VerifiedBadge className="w-4 h-4 shrink-0" />
                        )}
                      </div>
                      {seller.city && (
                        <div className="flex items-center gap-1 text-xs text-zinc-300">
                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{seller.city}, Nigeria</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Regenerated Look Tag */}
                  <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-zinc-300 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-md">
                    <span>Authentic Zango Grade</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Title & Tagline Details */}
            <div className="my-5 flex flex-col text-left">
              <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-white leading-tight line-clamp-2 drop-shadow-md">
                {product.name}
              </h1>
              {customTagline ? (
                <p
                  className="mt-2 text-base font-medium tracking-wide"
                  style={{ color: resolvedTheme.borderAccent }}
                >
                  "{customTagline}"
                </p>
              ) : product.description ? (
                <p className="mt-2 text-sm text-zinc-300 line-clamp-2 leading-relaxed opacity-90">
                  {product.description}
                </p>
              ) : (
                <p className="mt-2 text-sm text-zinc-300">
                  Direct from verified northern merchant in {seller.city || "Nigeria"}.
                </p>
              )}
            </div>

            {/* Bottom Callout: WhatsApp Direct Order & QR Code */}
            <div
              className="relative p-6 sm:p-7 rounded-[32px] border backdrop-blur-xl shadow-2xl flex items-center justify-between gap-5"
              style={{
                backgroundColor: "rgba(18, 14, 12, 0.85)",
                borderColor: `${resolvedTheme.borderAccent}70`,
              }}
            >
              {/* WhatsApp Direct Order Box */}
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366] text-white shadow-md">
                    <MessageCircle className="w-5 h-5 fill-white" />
                  </div>
                  <span className="text-xs uppercase tracking-widest font-black text-[#25D366]">
                    Direct WhatsApp Order
                  </span>
                </div>

                <div className="mt-1">
                  <p className="text-xl sm:text-2xl font-extrabold text-white tracking-wide">
                    {formattedPhone}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Fast reply • Nationwide delivery • Safe checkout
                  </p>
                </div>

                {/* Direct Action Badge */}
                {showWhatsAppBadge && (
                  <div className="mt-2 inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full bg-[#25D366]/20 border border-[#25D366]/50 text-[#25D366] text-xs font-bold">
                    <span>Message to Buy Now</span>
                    <span>→</span>
                  </div>
                )}
              </div>

              {/* Scannable QR Code */}
              {showQRCode && (
                <div className="flex flex-col items-center shrink-0">
                  <div className="p-2.5 rounded-2xl bg-white shadow-xl border-2 border-amber-400/40">
                    <QRCodeSVG
                      value={productUrl}
                      size={110}
                      level="M"
                      includeMargin={false}
                      fgColor="#1C100B"
                      bgColor="#FFFFFF"
                    />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400 mt-1.5">
                    Scan to Buy
                  </span>
                </div>
              )}
            </div>

            {/* Footer ZANGO Watermark */}
            <div className="mt-4 flex items-center justify-between text-zinc-400 text-xs px-2">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verified Northern Market Guarantee
              </span>
              <span className="tracking-widest uppercase font-mono text-[11px] opacity-75">
                zango-connect.vercel.app
              </span>
            </div>
          </div>
        ) : isSquare ? (
          /* ───────── 1:1 SQUARE FORMAT (Instagram Feed & Square Showcase) ───────── */
          <div className="relative z-10 flex flex-col justify-between h-[calc(100%-110px)] px-10 pb-10 pt-4">
            {/* Center Grid: Left Product Photo + Right Specifications */}
            <div className="grid grid-cols-12 gap-8 items-center my-auto">
              {/* Left Photo Showcase (Col 7) */}
              <div className="col-span-7">
                <div
                  className="relative w-full aspect-square overflow-hidden rounded-[32px] border-2 shadow-2xl"
                  style={{
                    borderColor: `${resolvedTheme.borderAccent}70`,
                    backgroundColor: "#0D0B0A",
                  }}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                      No Image
                    </div>
                  )}

                  {/* Stock pill */}
                  {showStockBadge && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-black/80 backdrop-blur-md text-white border border-white/20">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>{displayStockLabel}</span>
                    </div>
                  )}

                  {/* Price Tag Pill */}
                  <div
                    className="absolute bottom-4 right-4 px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md border"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.85)",
                      borderColor: resolvedTheme.borderAccent,
                    }}
                  >
                    <span
                      className="font-serif text-2xl font-black"
                      style={{ color: resolvedTheme.borderAccent }}
                    >
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Product & Merchant Info (Col 5) */}
              <div className="col-span-5 flex flex-col justify-between h-full space-y-5">
                <div>
                  <h2 className="font-serif text-3xl font-extrabold text-white leading-tight line-clamp-3">
                    {product.name}
                  </h2>
                  {customTagline ? (
                    <p
                      className="mt-2 text-sm font-semibold"
                      style={{ color: resolvedTheme.borderAccent }}
                    >
                      {customTagline}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-300 line-clamp-3">
                      {product.description || "Premium authentic northern marketplace selection."}
                    </p>
                  )}
                </div>

                {/* Vendor details */}
                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 backdrop-blur-md space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate">
                      {seller.business_name}
                    </span>
                    {showVerifiedBadge && seller.is_verified && (
                      <VerifiedBadge className="w-4 h-4 shrink-0" />
                    )}
                  </div>
                  {seller.city && (
                    <div className="flex items-center gap-1 text-xs text-zinc-300">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      <span>{seller.city}, Nigeria</span>
                    </div>
                  )}
                </div>

                {/* WhatsApp callout */}
                <div className="p-4 rounded-2xl bg-[#25D366]/15 border border-[#25D366]/40 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#25D366] uppercase tracking-wider">
                      <MessageCircle className="w-3.5 h-3.5 fill-[#25D366]" />
                      WhatsApp Order
                    </div>
                    <p className="text-sm font-bold text-white mt-0.5">{formattedPhone}</p>
                  </div>
                  {showQRCode && (
                    <div className="p-1.5 bg-white rounded-xl shrink-0">
                      <QRCodeSVG value={productUrl} size={50} level="L" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verified Merchant on ZANGO
              </span>
              <span className="font-mono text-[11px]">{getProductStoreUrl(seller.slug)}</span>
            </div>
          </div>
        ) : (
          /* ───────── 16:9 LANDSCAPE FORMAT ───────── */
          <div className="relative z-10 flex flex-col justify-between h-[calc(100%-110px)] px-12 pb-8 pt-2">
            <div className="grid grid-cols-12 gap-8 items-center my-auto">
              <div className="col-span-5">
                <div
                  className="relative w-full h-[360px] overflow-hidden rounded-3xl border-2 shadow-2xl"
                  style={{
                    borderColor: `${resolvedTheme.borderAccent}70`,
                    backgroundColor: "#0D0B0A",
                  }}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">
                      No Image
                    </div>
                  )}
                  {showStockBadge && (
                    <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-black/80 text-white border border-white/20">
                      {displayStockLabel}
                    </span>
                  )}
                </div>
              </div>

              <div className="col-span-7 flex flex-col justify-between space-y-4">
                <div>
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: resolvedTheme.borderAccent }}
                  >
                    {seller.business_name} • {seller.city || "Nigeria"}
                  </span>
                  <h2 className="font-serif text-3xl font-extrabold text-white leading-tight mt-1">
                    {product.name}
                  </h2>
                </div>

                <div className="flex items-baseline gap-3">
                  <span
                    className="font-serif text-4xl font-extrabold"
                    style={{ color: resolvedTheme.borderAccent }}
                  >
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">
                    Official Marketplace Price
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                      <MessageCircle className="w-6 h-6 fill-white" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase text-[#25D366] tracking-wider">
                        Direct WhatsApp
                      </span>
                      <p className="text-base font-bold text-white">{formattedPhone}</p>
                    </div>
                  </div>

                  {showQRCode && (
                    <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                      <div className="p-1.5 bg-white rounded-lg">
                        <QRCodeSVG value={productUrl} size={50} level="L" />
                      </div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400">
                        Scan to View
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/10">
              <span>ZANGO Market • Northern Nigeria</span>
              <span className="font-mono text-[11px]">zango-connect.vercel.app</span>
            </div>
          </div>
        )}
      </div>
    );
  },
);

ProductMarketingCard.displayName = "ProductMarketingCard";
