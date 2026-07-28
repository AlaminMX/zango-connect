import * as React from "react";

import { cn } from "@/lib/utils";
import { PRODUCT_SHARE_CARD_WIDTH, PRODUCT_SHARE_CARD_HEIGHT } from "@/lib/product-share-card/export";
import type { ProductShareCardProps } from "@/lib/product-share-card/types";

const ACCENT = "#C05A3F";
const ESPRESSO = "#3E2723";
const CREAM = "#FCF9F5";
const GLOW = "#E8C8B8";

function priceLabel(price?: number | string | null) {
  const n = price != null ? Number(price) : null;
  if (n != null && n > 0) return `₦${n.toLocaleString()}`;
  return "Price on request";
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

/**
 * ProductShareCard — a standalone, single-format (1080×1080 Instagram square)
 * marketing card for one product. Deliberately its own design system, separate
 * from the vendor identity card — different data shape (one product, not a
 * store roundup) and a simpler, single-theme look meant to be generated in
 * one tap from the product page.
 */
export const ProductShareCard = React.forwardRef<HTMLDivElement, ProductShareCardProps>(
  ({ product, vendor, className }, ref) => {
    const image = product.image_url;

    return (
      <div
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        style={{
          width: PRODUCT_SHARE_CARD_WIDTH,
          height: PRODUCT_SHARE_CARD_HEIGHT,
          backgroundColor: CREAM,
          borderRadius: 48,
          fontFamily: "inherit",
        }}
      >
        {/* Product image, full-bleed top ~70% */}
        <div className="absolute inset-x-0 top-0" style={{ height: 760 }}>
          {image ? (
            <img src={image} alt={product.name} className="h-full w-full object-cover" crossOrigin="anonymous" />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: GLOW, color: ESPRESSO }}>
              <span className="text-2xl font-semibold opacity-60">No image</span>
            </div>
          )}
          {/* Bottom scrim so overlaid chips stay legible over any photo */}
          <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(to top, rgba(0,0,0,.55), rgba(0,0,0,0))" }} />

          {/* ZANGO wordmark, top-left */}
          <div className="absolute left-8 top-8 flex items-center gap-2 rounded-full px-4 py-2 shadow-lg" style={{ backgroundColor: "rgba(252,249,245,.92)" }}>
            <div className="grid h-7 w-7 place-items-center rounded-lg text-sm font-black" style={{ backgroundColor: ACCENT, color: CREAM }}>Z</div>
            <span className="text-base font-black tracking-tight" style={{ color: ESPRESSO }}>ZANGO</span>
          </div>

          {/* Price pill, top-right */}
          <div className="absolute right-8 top-8 rounded-full px-5 py-2.5 text-xl font-bold shadow-lg" style={{ backgroundColor: ACCENT, color: CREAM }}>
            {priceLabel(product.price)}
          </div>
        </div>

        {/* Bottom info panel */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col justify-center gap-4 px-10" style={{ height: 320 }}>
          <h1
            className="line-clamp-2 text-4xl font-black leading-tight"
            style={{ color: ESPRESSO, fontFamily: "Georgia, serif" }}
          >
            {product.name}
          </h1>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full text-lg font-bold" style={{ backgroundColor: GLOW, color: ESPRESSO }}>
                {initials(vendor.business_name)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-semibold" style={{ color: ESPRESSO }}>{vendor.business_name}</span>
                  {vendor.is_verified && (
                    <svg viewBox="0 0 24 24" width={20} height={20} aria-label="Verified seller">
                      <circle cx="12" cy="12" r="10" fill="#22C55E" />
                      <path d="M8.5 12.6l2.4 2.4 5-5.6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  )}
                </div>
                {vendor.city && (
                  <span className="text-sm" style={{ color: "#7A6B5D" }}>📍 {vendor.city}</span>
                )}
              </div>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[.18em]" style={{ color: "#7A6B5D" }}>Kasuwancin Arewa</span>
          </div>
        </div>
      </div>
    );
  }
);
ProductShareCard.displayName = "ProductShareCard";
