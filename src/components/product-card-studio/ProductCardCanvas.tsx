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
  ProductCardCustomization,
  ProductMarketingCardProduct,
  ProductMarketingCardSeller,
} from "@/lib/product-card/types";

export interface ProductCardCanvasProps {
  product: ProductMarketingCardProduct;
  seller: ProductMarketingCardSeller;
  customization: ProductCardCustomization;
  className?: string;
  style?: React.CSSProperties;
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
      <polygon points="50,15 85,50 50,85 15,50" strokeWidth="2.5" opacity="0.9" />
      <polygon points="50,28 72,50 50,72 28,50" strokeWidth="2" opacity="0.6" />
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

/**
 * ProductCardCanvas
 * Renders the product marketing card using SVG vector motifs, dynamic badges,
 * northern market aesthetics, and direct QR code for exportable image generation.
 * Supports dual framing modes:
 *  - "hero-75": Prominent enlarged 75% hero product image frame
 *  - "full-bleed": Full-bleed background with frosted-glass overlay details
 */
export const ProductCardCanvas = React.forwardRef<HTMLDivElement, ProductCardCanvasProps>(
  ({ product, seller, customization, className, style }, ref) => {
    const {
      format = "whatsapp-status",
      theme,
      variation = 0,
      framingMode = "hero-75",
      showWhatsAppBadge = true,
      showVerifiedBadge = true,
      showStockBadge = true,
      showQRCode = true,
      customTagline,
    } = customization;

    const dimensions = productCardFormats[format] || productCardFormats["whatsapp-status"];
    const resolvedTheme = resolveProductCardTheme(
      product.category || seller.category,
      theme,
      `${product.name} ${seller.business_name}`,
    );

    const storeUrl = getProductStoreUrl(seller.slug || product.seller_slug, product.id);
    const formattedPhone = formatCardPhoneNumber(product.whatsapp_number || seller.whatsapp_number);

    const priceLabel = formatPrice(product.price);
    const isSoldOut = product.stock_status === "sold_out";
    const isLowStock = product.stock_status === "low_stock";
    const stockLabel = isSoldOut
      ? "Sold Out"
      : isLowStock
        ? "Selling Fast 🔥"
        : "Available in Stock";

    const isSquare = format === "square";
    const isStory = format === "story";
    const isStatus = format === "whatsapp-status";
    const isLandscape = format === "landscape";
    const isFullBleed = framingMode === "full-bleed";

    return (
      <div
        ref={ref}
        data-product-card-canvas="true"
        data-format={format}
        data-framing={framingMode}
        data-theme={resolvedTheme.name}
        className={cn(
          "relative overflow-hidden font-sans select-none flex flex-col justify-between shadow-2xl",
          className,
        )}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          minWidth: `${dimensions.width}px`,
          minHeight: `${dimensions.height}px`,
          background: isFullBleed ? "#120E0C" : resolvedTheme.bgGradient,
          color: resolvedTheme.textPrimary,
          ...style,
        }}
      >
        {/* ── FULL-BLEED BACKGROUND MODE ── */}
        {isFullBleed && product.image_url && (
          <>
            <img
              src={product.image_url}
              alt={product.name}
              crossOrigin="anonymous"
              className="absolute inset-0 w-full h-full object-cover z-0 scale-100 transition-transform duration-700"
            />
            {/* Extremely Light & Clear Vignette for Maximum Product Brightness */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15 z-0" />
            <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] z-0" />
          </>
        )}

        {/* Northern SVG Arch Pattern Header Decoration */}
        <div className="absolute top-0 left-0 right-0 z-0 pointer-events-none opacity-50">
          <NorthernArchPattern color={resolvedTheme.accent} className="w-full h-16" />
        </div>

        {/* Subtle radial ambient glow (in hero mode) */}
        {!isFullBleed && (
          <>
            <div
              className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none blur-3xl opacity-40"
              style={{ background: resolvedTheme.glow }}
            />
            <div
              className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full pointer-events-none blur-2xl opacity-30"
              style={{ background: resolvedTheme.accentLight }}
            />
          </>
        )}

        {/* ── TOP HEADER / SELLER BRANDING ── */}
        <div
          className={cn(
            "relative z-10 transition-all",
            isFullBleed
              ? "mx-8 mt-6 p-4 rounded-2xl backdrop-blur-md bg-black/45 border border-white/20 shadow-xl flex items-center justify-between gap-4"
              : isSquare
                ? "px-8 pt-5 pb-1 flex items-center justify-between gap-4"
                : "px-8 pt-8 pb-4 flex items-center justify-between gap-4",
          )}
        >
          <div className="flex items-center gap-4 min-w-0">
            {seller.profile_photo_url ? (
              <img
                src={seller.profile_photo_url}
                alt={seller.business_name}
                crossOrigin="anonymous"
                className={cn("rounded-full object-cover border-2 shadow-md shrink-0", isSquare ? "w-12 h-12" : "w-14 h-14")}
                style={{ borderColor: resolvedTheme.borderAccent }}
              />
            ) : (
              <div
                className={cn("rounded-full flex items-center justify-center font-bold uppercase border-2 shadow-md shrink-0", isSquare ? "w-12 h-12 text-lg" : "w-14 h-14 text-xl")}
                style={{
                  background: resolvedTheme.cardBg,
                  borderColor: resolvedTheme.borderAccent,
                  color: resolvedTheme.accent,
                }}
              >
                {seller.business_name ? seller.business_name.slice(0, 2) : "ZG"}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={cn("font-bold tracking-tight truncate drop-shadow-sm text-white", isSquare ? "text-lg" : "text-xl")}>
                  {seller.business_name || "Northern Market Vendor"}
                </h3>
                {showVerifiedBadge && (seller.is_verified ?? true) && (
                  <VerifiedBadge className={cn("shrink-0", isSquare ? "h-4 w-4" : "h-5 w-5")} />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/85 mt-0.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: resolvedTheme.accent }} />
                <span className="font-medium truncate">
                  {seller.city || product.seller_city || "Kano, Nigeria"}
                </span>
                {seller.category && (
                  <>
                    <span className="opacity-40">·</span>
                    <span className="truncate opacity-90">{seller.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Arewa Northern Emblem */}
          <div className="shrink-0 flex items-center gap-2">
            <ArewaKnotEmblem color={resolvedTheme.accent} className={cn("opacity-90", isSquare ? "w-10 h-10" : "w-12 h-12")} />
          </div>
        </div>

        {/* ── MAIN PRODUCT SHOWCASE AREA (75% Prominent Hero Fill) ── */}
        <div
          className={cn(
            "relative z-10 px-8 flex-1 flex flex-col justify-center items-center my-auto",
            isSquare ? "py-2" : "py-3",
            isLandscape && "flex-row items-center gap-6",
            isFullBleed && "justify-center py-4",
          )}
        >
          {/* Main Hero Product Image Container - 75% Prominent Fill */}
          {!isFullBleed && (
            <div
              className={cn(
                "relative mx-auto rounded-3xl overflow-hidden border-2 shadow-2xl transition-all duration-300 flex items-center justify-center",
                isSquare
                  ? "w-[960px] h-[720px]"
                  : isStory || isStatus
                    ? "w-[960px] h-[1160px]"
                    : "w-[1040px] h-[460px]",
              )}
              style={{
                borderColor: resolvedTheme.borderAccent,
                background: resolvedTheme.cardBg,
              }}
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  crossOrigin="anonymous"
                  className="w-full h-full object-contain bg-black/10 p-4"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground opacity-60">
                  <Package className="w-24 h-24" style={{ color: resolvedTheme.accent }} />
                  <span className="text-xl font-medium">Authentic Market Product</span>
                </div>
              )}

              {/* Dynamic Stock Badge Overlay */}
              {showStockBadge && (
                <div className="absolute top-5 left-5 z-20">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold tracking-wide shadow-lg uppercase backdrop-blur-md border",
                      isSoldOut
                        ? "bg-rose-900/90 text-rose-100 border-rose-500/40"
                        : isLowStock
                          ? "bg-amber-600/90 text-white border-amber-300/40"
                          : "bg-emerald-900/90 text-emerald-100 border-emerald-400/40",
                    )}
                  >
                    {isLowStock ? <Flame className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {stockLabel}
                  </span>
                </div>
              )}

              {/* Northern Watermark Seal */}
              <div className="absolute bottom-5 right-5 z-20 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs text-white/90 border border-white/20">
                <span className="font-serif tracking-widest uppercase font-bold text-[10px]">
                  ZANGO CONNECT
                </span>
              </div>
            </div>
          )}

          {/* Product Details & Price Block (With Safe Padding for Full-Bleed) */}
          <div
            className={cn(
              "mt-3 text-center w-full",
              isLandscape && "mt-0 text-left flex-1",
              isFullBleed && "mx-auto max-w-[960px] w-full p-6 rounded-3xl backdrop-blur-xl bg-black/55 border border-white/20 shadow-2xl my-2",
            )}
          >
            <div className="inline-flex items-center gap-2 mb-1.5 px-3.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-black/30 backdrop-blur-sm border border-white/15 text-white/95">
              <Sparkles className="w-3.5 h-3.5" style={{ color: resolvedTheme.accent }} />
              <span>{customTagline || resolvedTheme.subtitle || "Authentic Northern Quality"}</span>
            </div>

            <h1
              className={cn(
                "font-serif font-black tracking-tight leading-tight line-clamp-2 drop-shadow-md mx-auto text-white",
                isSquare ? "text-3xl max-w-[900px]" : "text-4xl sm:text-5xl max-w-[960px]",
              )}
            >
              {product.name}
            </h1>

            {/* Price Highlight Banner */}
            <div className="mt-3 inline-flex items-center justify-center">
              <div
                className={cn("rounded-2xl border-2 shadow-xl backdrop-blur-md flex items-center gap-2.5", isSquare ? "py-2 px-6" : "py-2.5 px-7")}
                style={{
                  background: isFullBleed ? "rgba(0, 0, 0, 0.7)" : resolvedTheme.cardBg,
                  borderColor: resolvedTheme.accent,
                }}
              >
                <span className="text-xs uppercase tracking-widest font-semibold text-white/80">
                  PRICE:
                </span>
                <span
                  className={cn("font-black tracking-tight drop-shadow-sm", isSquare ? "text-3xl" : "text-4xl sm:text-5xl")}
                  style={{ color: resolvedTheme.accent }}
                >
                  {priceLabel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM CALL TO ACTION & BADGES BAR ── */}
        <div
          className={cn(
            "relative z-10 flex items-center justify-between gap-6 transition-all",
            isFullBleed
              ? "mx-6 mb-6 p-6 sm:p-8 rounded-3xl backdrop-blur-xl bg-black/75 border border-white/25 shadow-2xl"
              : isSquare
                ? "px-8 py-5 border-t backdrop-blur-md"
                : "p-8 sm:p-10 border-t backdrop-blur-md",
          )}
          style={{
            borderColor: isFullBleed ? "rgba(255, 255, 255, 0.25)" : resolvedTheme.borderAccent,
            background: isFullBleed ? undefined : "rgba(0, 0, 0, 0.45)",
          }}
        >
          {/* WhatsApp Direct Order Badge */}
          <div className="flex flex-col gap-1.5 min-w-0">
            {showWhatsAppBadge && formattedPhone && (
              <div
                className={cn("inline-flex items-center gap-3 rounded-2xl border shadow-lg", isSquare ? "px-4 py-2.5" : "px-5 py-3")}
                style={{
                  background: "#25D366",
                  color: "#052e16",
                  borderColor: "#128C7E",
                }}
              >
                <MessageCircle className={cn("shrink-0 fill-current", isSquare ? "h-6 w-6" : "h-7 w-7")} />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-extrabold tracking-wider leading-none">
                    ORDER DIRECT ON WHATSAPP
                  </p>
                  <p className={cn("font-black tracking-wide leading-tight truncate", isSquare ? "text-base" : "text-lg")}>
                    {formattedPhone}
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-white/80 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" style={{ color: resolvedTheme.accent }} />
              Fast direct response from seller · Safe & verified
            </p>
          </div>

          {/* QR Code For Instant Marketplace Store Scan */}
          {showQRCode && (
            <div className="flex items-center gap-3 shrink-0 bg-white/10 p-2.5 rounded-2xl border border-white/20 backdrop-blur-sm">
              <div className="p-1.5 bg-white rounded-xl shadow-md">
                <QRCodeSVG
                  value={storeUrl}
                  size={isSquare ? 75 : 90}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[10px] font-bold uppercase tracking-wider leading-tight text-white/90">
                  SCAN TO VIEW
                </p>
                <p className="text-xs font-semibold text-white/80 leading-snug">Buy on Zango</p>
                <p className="text-[10px] font-mono mt-0.5" style={{ color: resolvedTheme.accent }}>
                  zango.ng
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

ProductCardCanvas.displayName = "ProductCardCanvas";
