import type { ProductCardFormat, ProductCardTheme, ProductCardThemeName } from "./types";

export const ZANGO_STORE_ORIGIN =
  typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "https://zango-connect.vercel.app";

export const productCardFormats: Record<
  ProductCardFormat,
  { label: string; width: number; height: number; description: string; badge: string; icon: string }
> = {
  "whatsapp-status": {
    label: "WhatsApp Status",
    width: 1080,
    height: 1920,
    description: "9:16 Full-screen story optimized for WhatsApp Status & Direct Chat",
    badge: "9:16 Status",
    icon: "MessageCircle",
  },
  square: {
    label: "Square Post",
    width: 1080,
    height: 1080,
    description: "1:1 Universal feed post for Instagram, WhatsApp catalogs & Twitter",
    badge: "1:1 Square",
    icon: "Square",
  },
  story: {
    label: "Instagram / Snap Story",
    width: 1080,
    height: 1920,
    description: "9:16 Vertical editorial layout for Instagram Stories & Snapchat",
    badge: "9:16 Story",
    icon: "Smartphone",
  },
  landscape: {
    label: "Banner / Landscape",
    width: 1200,
    height: 675,
    description: "16:9 Landscape banner for Facebook, group chats & website embeds",
    badge: "16:9 Banner",
    icon: "Layout",
  },
};

export const productCardThemes: Record<ProductCardThemeName, ProductCardTheme> = {
  "zango-signature": {
    name: "zango-signature",
    label: "ZANGO Earth",
    subtitle: "Warm Northern Terracotta & Amber Ochre",
    accent: "#804723",
    accentDeep: "#24150E",
    accentLight: "#E8C8B8",
    glow: "#F6D0B8",
    bgGradient: "linear-gradient(135deg, #1C100B 0%, #2E1911 50%, #4D2615 100%)",
    cardBg: "#1C100B",
    badgeBg: "#C05A3F",
    textPrimary: "#FCF9F5",
    textSecondary: "#D8C5B8",
    motif: "AREWA",
    borderAccent: "#D4936B",
  },
  "kano-indigo": {
    name: "kano-indigo",
    label: "Kano Indigo",
    subtitle: "Historic Kofar Mata Deep Dye Pit & Royal Gold",
    accent: "#1E3A8A",
    accentDeep: "#0C1425",
    accentLight: "#C5D7F8",
    glow: "#3B82F6",
    bgGradient: "linear-gradient(135deg, #09101C 0%, #101B2E 50%, #1A2D4C 100%)",
    cardBg: "#0C1425",
    badgeBg: "#2563EB",
    textPrimary: "#F8FAFC",
    textSecondary: "#CBD5E1",
    motif: "DYE_PITS",
    borderAccent: "#E5B25D",
  },
  "arewa-emerald": {
    name: "arewa-emerald",
    label: "Arewa Emerald",
    subtitle: "Northern Savannah Oasis & Burnished Brass",
    accent: "#166534",
    accentDeep: "#0A1F13",
    accentLight: "#BBF7D0",
    glow: "#22C55E",
    bgGradient: "linear-gradient(135deg, #07150C 0%, #0E2718 50%, #184128 100%)",
    cardBg: "#0A1F13",
    badgeBg: "#15803D",
    textPrimary: "#F0FDF4",
    textSecondary: "#A7F3D0",
    motif: "SAVANNAH",
    borderAccent: "#FACC15",
  },
  "sahara-sand": {
    name: "sahara-sand",
    label: "Sahara Golden Sand",
    subtitle: "Sahelian Ochre, Sunlit Dunes & Warm Clay",
    accent: "#9A641A",
    accentDeep: "#241708",
    accentLight: "#FDE68A",
    glow: "#F59E0B",
    bgGradient: "linear-gradient(135deg, #1A1106 0%, #2B1C0B 50%, #462E12 100%)",
    cardBg: "#1A1106",
    badgeBg: "#D97706",
    textPrimary: "#FFFBEB",
    textSecondary: "#FDE68A",
    motif: "DUNES",
    borderAccent: "#F59E0B",
  },
  "sahel-onyx": {
    name: "sahel-onyx",
    label: "Sahelian Onyx",
    subtitle: "Midnight Obsidian & Polished 24K Gold",
    accent: "#CA8A04",
    accentDeep: "#0A0A0C",
    accentLight: "#FEF08A",
    glow: "#EAB308",
    bgGradient: "linear-gradient(135deg, #050506 0%, #0D0E12 50%, #17181F 100%)",
    cardBg: "#0A0A0C",
    badgeBg: "#A16207",
    textPrimary: "#FFFFFF",
    textSecondary: "#D4D4D8",
    motif: "MINIMAL_ROYAL",
    borderAccent: "#EAB308",
  },
  fashion: {
    name: "fashion",
    label: "Fashion Atelier",
    subtitle: "Northern Couture, Brocades & Luxury Embroidery",
    accent: "#831843",
    accentDeep: "#1F0510",
    accentLight: "#FBCFE8",
    glow: "#EC4899",
    bgGradient: "linear-gradient(135deg, #17040C 0%, #270815 50%, #400E23 100%)",
    cardBg: "#1F0510",
    badgeBg: "#BE185D",
    textPrimary: "#FDF2F8",
    textSecondary: "#F472B6",
    motif: "BROCADE",
    borderAccent: "#F472B6",
  },
  beauty: {
    name: "beauty",
    label: "Shea & Rose Glow",
    subtitle: "Pure Organic Northern Botanicals & Fragrance",
    accent: "#9D174D",
    accentDeep: "#1F0511",
    accentLight: "#FCE7F3",
    glow: "#F43F5E",
    bgGradient: "linear-gradient(135deg, #19050E 0%, #2E0819 50%, #4A0E2A 100%)",
    cardBg: "#1F0511",
    badgeBg: "#BE123C",
    textPrimary: "#FFF1F2",
    textSecondary: "#FDA4AF",
    motif: "FLORAL",
    borderAccent: "#FB7185",
  },
  culinary: {
    name: "culinary",
    label: "Spices & Dates",
    subtitle: "Northern Spices, Suya Aroma & Gourmet Treats",
    accent: "#9A3412",
    accentDeep: "#200A04",
    accentLight: "#FED7AA",
    glow: "#F97316",
    bgGradient: "linear-gradient(135deg, #180703 0%, #2A0E06 50%, #45170B 100%)",
    cardBg: "#200A04",
    badgeBg: "#C2410C",
    textPrimary: "#FFF7ED",
    textSecondary: "#FDBA74",
    motif: "SPICE",
    borderAccent: "#FB923C",
  },
  tech: {
    name: "tech",
    label: "Modern Gadgets",
    subtitle: "Sleek Carbon & Cyber Cyan Neon",
    accent: "#0284C7",
    accentDeep: "#06131D",
    accentLight: "#BAE6FD",
    glow: "#06B6D4",
    bgGradient: "linear-gradient(135deg, #030B12 0%, #0A1C2B 50%, #102B42 100%)",
    cardBg: "#06131D",
    badgeBg: "#0369A1",
    textPrimary: "#F0F9FF",
    textSecondary: "#7DD3FC",
    motif: "TECH_GRID",
    borderAccent: "#38BDF8",
  },
};

export function resolveProductCardTheme(
  category?: string | null,
  preferred?: ProductCardThemeName,
  extraContext?: string | null,
): ProductCardTheme {
  if (preferred && productCardThemes[preferred]) {
    return productCardThemes[preferred];
  }

  const combined = `${category ?? ""} ${extraContext ?? ""}`.toLowerCase();
  if (
    combined.includes("fashion") ||
    combined.includes("cloth") ||
    combined.includes("shoe") ||
    combined.includes("bag") ||
    combined.includes("abaya") ||
    combined.includes("kaftan") ||
    combined.includes("cap") ||
    combined.includes("baban riga") ||
    combined.includes("fabric") ||
    combined.includes("textile")
  ) {
    return productCardThemes.fashion;
  }

  if (
    combined.includes("beauty") ||
    combined.includes("skin") ||
    combined.includes("cream") ||
    combined.includes("oil") ||
    combined.includes("perfume") ||
    combined.includes("turaren wuta") ||
    combined.includes("humra") ||
    combined.includes("soap") ||
    combined.includes("makeup")
  ) {
    return productCardThemes.beauty;
  }

  if (
    combined.includes("food") ||
    combined.includes("spice") ||
    combined.includes("kilishi") ||
    combined.includes("date") ||
    combined.includes("sweet") ||
    combined.includes("drink") ||
    combined.includes("snack") ||
    combined.includes("culinary") ||
    combined.includes("cake")
  ) {
    return productCardThemes.culinary;
  }

  if (
    combined.includes("phone") ||
    combined.includes("tech") ||
    combined.includes("gadget") ||
    combined.includes("laptop") ||
    combined.includes("electronic") ||
    combined.includes("watch")
  ) {
    return productCardThemes.tech;
  }

  if (combined.includes("kano")) {
    return productCardThemes["kano-indigo"];
  }

  // Default northern flagship theme
  return productCardThemes["zango-signature"];
}

export function getProductStoreUrl(slug?: string | null, productId?: string): string {
  if (productId) {
    return `${ZANGO_STORE_ORIGIN}/product/${productId}`;
  }
  if (slug) {
    return `${ZANGO_STORE_ORIGIN}/store/${slug}`;
  }
  return ZANGO_STORE_ORIGIN;
}

export function formatCardPhoneNumber(num?: string | null): string {
  if (!num) return "+234 800 000 0000";
  const clean = num.replace(/[^\d+]/g, "");
  if (clean.startsWith("+234") && clean.length === 14) {
    return `+234 ${clean.slice(4, 7)} ${clean.slice(7, 10)} ${clean.slice(10)}`;
  }
  if (clean.startsWith("234") && clean.length === 13) {
    return `+234 ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  }
  if (clean.startsWith("0") && clean.length === 11) {
    return `+234 ${clean.slice(1, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return num;
}
