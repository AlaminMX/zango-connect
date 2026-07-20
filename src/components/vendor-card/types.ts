/**
 * Vendor Share Card — shared types & constants.
 *
 * The card is always laid out at a fixed 1600×900 "design canvas" so the
 * exported PNG is pixel-perfect regardless of how small it is previewed on
 * screen. See `VendorCardExport.tsx` for how the canvas is scaled down
 * responsively for display while still being captured at full resolution.
 */

export interface VendorCardProps {
  /** Vendor / store display name. */
  businessName: string;
  /** Short bio / tagline. Clamped to 2 lines. */
  description?: string | null;
  /** Circular profile logo. Falls back to the business initial. */
  logo?: string | null;
  /** Wide hero/cover photo. Falls back to a gradient panel. */
  coverImage?: string | null;
  /** e.g. "Fashion", "Electronics". */
  category: string;
  /** e.g. "Lagos, Nigeria". */
  location: string;
  /** Shows the "Verified Vendor" row when true. */
  verified?: boolean;
  /** Total number of live products. */
  productCount: number;
  /** ISO date string (or Date) the vendor joined Zango. */
  joinDate: string | Date;
  /** Store slug used to build https://zango.com.ng/store/{slug}. */
  slug: string;
  /** Optional className applied to the outermost export wrapper. */
  className?: string;
}

/** Fixed design-time export dimensions (desktop export target). */
export const CARD_WIDTH = 1600;
export const CARD_HEIGHT = 900;

/** PNG is exported at 2x pixel density on top of the 1600×900 canvas. */
export const EXPORT_PIXEL_RATIO = 2;

/** Canonical public store URL builder used by both the QR code and the label. */
export const STORE_HOST = "zango.com.ng";

export function buildStoreUrl(slug: string) {
  return `https://${STORE_HOST}/store/${slug}`;
}
