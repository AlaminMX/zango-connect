export type VendorCardThemeName = "fashion" | "beauty" | "food" | "electronics" | "automotive" | "home" | "books" | "services" | "default";

export type VendorCardFormat = "instagram-portrait" | "story" | "whatsapp-status" | "square" | "landscape" | "business-card" | "a4-flyer";

export interface VendorCardVendor {
  id: string;
  business_name: string;
  slug: string;
  whatsapp_number?: string | null;
  city?: string | null;
  category?: string | null;
  bio?: string | null;
  profile_photo_url?: string | null;
  cover_photo_url?: string | null;
  is_verified?: boolean | null;
  rating?: number | null;
  created_at?: string | null;
}

export interface VendorCardProduct {
  id: string;
  name: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  price?: number | string | null;
  status?: string | null;
  created_at?: string | null;
}

export interface VendorCardTheme {
  name: VendorCardThemeName;
  label: string;
  accent: string;
  accentDeep: string;
  glow: string;
  heroGradient: string;
  badge: string;
  lifestylePrompt: string;
  motif: string;
}

export interface VendorCardProps {
  vendor: VendorCardVendor;
  products?: VendorCardProduct[];
  theme?: VendorCardThemeName;
  format?: VendorCardFormat;
  className?: string;
}

export interface VendorCardExportOptions {
  node: HTMLElement;
  filename?: string;
  format?: VendorCardFormat;
  pixelRatio?: number;
}
