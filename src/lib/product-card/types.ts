export type ProductCardFormat = "whatsapp-status" | "square" | "story" | "landscape";

export type ProductCardThemeName =
  | "zango-signature"
  | "kano-indigo"
  | "arewa-emerald"
  | "sahara-sand"
  | "sahel-onyx"
  | "fashion"
  | "beauty"
  | "culinary"
  | "tech";

export interface ProductMarketingCardSeller {
  id: string;
  business_name: string;
  city?: string | null;
  whatsapp_number: string;
  slug?: string | null;
  is_verified?: boolean;
  profile_photo_url?: string | null;
  category?: string | null;
}

export interface ProductMarketingCardProduct {
  id: string;
  name: string;
  price?: number | string | null;
  image_url?: string | null;
  stock_status?: "available" | "low_stock" | "sold_out" | string | null;
  category?: string | null;
  description?: string | null;
  seller_id?: string;
  seller_name?: string;
  seller_city?: string;
  seller_slug?: string;
  whatsapp_number?: string;
  seller_is_verified?: boolean;
}

export type ProductCardFramingMode = "hero-75" | "full-bleed";

export interface ProductCardCustomization {
  format: ProductCardFormat;
  theme: ProductCardThemeName;
  variation: number; // 0, 1, 2 for regenerated layout styles
  framingMode?: ProductCardFramingMode; // "hero-75" (75% prominent hero) or "full-bleed" (full bleed frosted glass)
  showWhatsAppBadge: boolean;
  showVerifiedBadge: boolean;
  showStockBadge: boolean;
  showQRCode: boolean;
  customTagline?: string;
}

export interface ProductCardTheme {
  name: ProductCardThemeName;
  label: string;
  subtitle: string;
  accent: string;
  accentDeep: string;
  accentLight: string;
  glow: string;
  bgGradient: string;
  cardBg: string;
  badgeBg: string;
  textPrimary: string;
  textSecondary: string;
  motif: string;
  borderAccent: string;
}

export interface ProductCardExportOptions {
  node: HTMLElement;
  filename?: string;
  format?: ProductCardFormat;
  pixelRatio?: number;
}

export type QuickTemplateId =
  "modern-minimalist" | "rustic-bazaar" | "high-impact-sale" | "kano-royal" | "flash-deal";

export interface QuickTemplate {
  id: QuickTemplateId;
  name: string;
  subtitle: string;
  description: string;
  theme: ProductCardThemeName;
  variation: number;
  format?: ProductCardFormat;
  showWhatsAppBadge: boolean;
  showVerifiedBadge: boolean;
  showStockBadge: boolean;
  showQRCode: boolean;
  customTagline: string;
}
