import type { VendorCardFormat, VendorCardTheme, VendorCardThemeName } from "./types";

export const ZANGO_STORE_ORIGIN = "https://zango-connect.vercel.app";

export const vendorCardFormats: Record<
  VendorCardFormat,
  { label: string; width: number; height: number; description: string }
> = {
  landscape: {
    label: "Landscape",
    width: 1600,
    height: 1000,
    description: "Facebook, desktop & web banners",
  },
  "profile-picture": {
    label: "Profile Picture (Avatar)",
    width: 1080,
    height: 1080,
    description: "Circle-safe avatar for WhatsApp & social profiles",
  },
  square: {
    label: "Square",
    width: 1080,
    height: 1080,
    description: "Universal feed post",
  },
  "instagram-portrait": {
    label: "Instagram Portrait",
    width: 1080,
    height: 1350,
    description: "Best for feed posts",
  },
  story: {
    label: "Instagram Story",
    width: 1080,
    height: 1920,
    description: "Full-screen vertical story",
  },
  "whatsapp-status": {
    label: "WhatsApp Status",
    width: 1080,
    height: 1920,
    description: "Optimized for WhatsApp status",
  },
  "business-card": {
    label: "Business Card",
    width: 1050,
    height: 600,
    description: "Print-ready mini card",
  },
  "a4-flyer": {
    label: "A4 Flyer",
    width: 1240,
    height: 1754,
    description: "High-resolution flyer",
  },
};

export const vendorCardThemes: Record<VendorCardThemeName, VendorCardTheme> = {
  fashion: {
    name: "fashion",
    label: "Fashion Atelier",
    accent: "#804723",
    accentDeep: "#24150E",
    glow: "#E8C8B8",
    heroGradient: "from-[#F7E7DD] via-[#E8C8B8] to-[#9A513F]",
    badge: "FASHION",
    lifestylePrompt: "Luxury leather bags, textured fabrics, sculptural shoes",
    motif: "FASHION",
    lifestyleImage:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=80",
    defaultOfferings: ["Fashion", "Accessories", "Bags"],
    defaultTagline: "Timeless style, just for you.",
  },
  beauty: {
    name: "beauty",
    label: "Beauty Ritual",
    accent: "#944558",
    accentDeep: "#24150E",
    glow: "#F1CBD6",
    heroGradient: "from-[#FFF0F4] via-[#F1CBD6] to-[#B55B75]",
    badge: "BEAUTY",
    lifestylePrompt: "Perfume, skincare, makeup flat lay with soft editorial lighting",
    motif: "BEAUTY",
    lifestyleImage:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=80",
    defaultOfferings: ["Beauty", "Skincare", "Fragrance"],
    defaultTagline: "Natural radiance, crafted for you.",
  },
  food: {
    name: "food",
    label: "Culinary Studio",
    accent: "#8A4D1A",
    accentDeep: "#24150E",
    glow: "#F1D0A8",
    heroGradient: "from-[#FFF5E8] via-[#F1D0A8] to-[#A7632B]",
    badge: "FOOD & DRINK",
    lifestylePrompt: "Professional food photography, warm table styling",
    motif: "FOOD",
    lifestyleImage:
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=80",
    defaultOfferings: ["Food", "Treats", "Gourmet"],
    defaultTagline: "Authentic flavours, made with love.",
  },
  electronics: {
    name: "electronics",
    label: "Modern Tech",
    accent: "#455A64",
    accentDeep: "#1C282E",
    glow: "#D8E1E6",
    heroGradient: "from-[#F4F8FA] via-[#D8E1E6] to-[#536878]",
    badge: "TECH & GADGETS",
    lifestylePrompt: "Clean modern desk setup with premium devices",
    motif: "TECH",
    lifestyleImage:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1400&q=80",
    defaultOfferings: ["Gadgets", "Tech", "Accessories"],
    defaultTagline: "Smart technology for modern life.",
  },
  automotive: {
    name: "automotive",
    label: "Auto Luxe",
    accent: "#5D4037",
    accentDeep: "#211512",
    glow: "#D4C0B8",
    heroGradient: "from-[#F8F3EF] via-[#D4C0B8] to-[#6D4C41]",
    badge: "AUTOMOTIVE",
    lifestylePrompt: "Luxury car accessories, polished leather, chrome accents",
    motif: "AUTO",
    lifestyleImage:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80",
    defaultOfferings: ["Auto", "Parts", "Accessories"],
    defaultTagline: "Precision parts & auto care.",
  },
  home: {
    name: "home",
    label: "Home Editorial",
    accent: "#7A6B43",
    accentDeep: "#2E2619",
    glow: "#DED6BE",
    heroGradient: "from-[#FBF8EF] via-[#DED6BE] to-[#8A7A52]",
    badge: "HOME LIVING",
    lifestylePrompt: "Elegant interior styling, neutral home decor",
    motif: "HOME",
    lifestyleImage:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=80",
    defaultOfferings: ["Home", "Decor", "Living"],
    defaultTagline: "Elevating everyday living spaces.",
  },
  books: {
    name: "books",
    label: "Reading Room",
    accent: "#6D432B",
    accentDeep: "#26170E",
    glow: "#DFCAB8",
    heroGradient: "from-[#FBF3EB] via-[#DFCAB8] to-[#7A4F35]",
    badge: "BOOKS & MEDIA",
    lifestylePrompt: "Beautiful books, paper texture, reading room",
    motif: "BOOKS",
    lifestyleImage:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1400&q=80",
    defaultOfferings: ["Books", "Stationery", "Prints"],
    defaultTagline: "Knowledge and inspiration curated.",
  },
  services: {
    name: "services",
    label: "Service Suite",
    accent: "#5C603E",
    accentDeep: "#212415",
    glow: "#D8DDBF",
    heroGradient: "from-[#F8FAEF] via-[#D8DDBF] to-[#6F7350]",
    badge: "SERVICES",
    lifestylePrompt: "Premium service desk, notebook, calm workspace",
    motif: "SERVICE",
    lifestyleImage:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80",
    defaultOfferings: ["Services", "Consulting", "Solutions"],
    defaultTagline: "Professional excellence delivered.",
  },
  default: {
    name: "default",
    label: "ZANGO Signature",
    accent: "#804723",
    accentDeep: "#24150E",
    glow: "#E8C8B8",
    heroGradient: "from-[#FCF9F5] via-[#E8C8B8] to-[#C05A3F]",
    badge: "STORE",
    lifestylePrompt: "Boutique marketplace product editorial",
    motif: "ZANGO",
    lifestyleImage:
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1400&q=80",
    defaultOfferings: ["Fashion", "Accessories", "Bags"],
    defaultTagline: "Timeless style, just for you.",
  },
};

export function resolveVendorCardTheme(
  category?: string | null,
  preferred?: VendorCardThemeName,
  extraContext?: string | null,
): VendorCardTheme {
  if (preferred && vendorCardThemes[preferred]) return vendorCardThemes[preferred];
  const combined = `${category ?? ""} ${extraContext ?? ""}`.toLowerCase();
  if (
    combined.includes("fashion") ||
    combined.includes("cloth") ||
    combined.includes("shoe") ||
    combined.includes("bag") ||
    combined.includes("abaya") ||
    combined.includes("textile") ||
    combined.includes("wear") ||
    combined.includes("apparel") ||
    combined.includes("jewelry") ||
    combined.includes("jewel")
  )
    return vendorCardThemes.fashion;
  if (
    combined.includes("beauty") ||
    combined.includes("makeup") ||
    combined.includes("skin") ||
    combined.includes("perfume") ||
    combined.includes("scent") ||
    combined.includes("cosmetic") ||
    combined.includes("fragrance") ||
    combined.includes("oil")
  )
    return vendorCardThemes.beauty;
  if (
    combined.includes("food") ||
    combined.includes("drink") ||
    combined.includes("cater") ||
    combined.includes("bak") ||
    combined.includes("cake") ||
    combined.includes("kitchen") ||
    combined.includes("snack") ||
    combined.includes("restaurant") ||
    combined.includes("gourmet")
  )
    return vendorCardThemes.food;
  if (
    combined.includes("elect") ||
    combined.includes("phone") ||
    combined.includes("gadget") ||
    combined.includes("computer") ||
    combined.includes("laptop") ||
    combined.includes("tech") ||
    combined.includes("audio")
  )
    return vendorCardThemes.electronics;
  if (
    combined.includes("auto") ||
    combined.includes("car") ||
    combined.includes("motor") ||
    combined.includes("vehicle") ||
    combined.includes("tyre") ||
    combined.includes("tire")
  )
    return vendorCardThemes.automotive;
  if (
    combined.includes("home") ||
    combined.includes("decor") ||
    combined.includes("interior") ||
    combined.includes("furniture") ||
    combined.includes("living")
  )
    return vendorCardThemes.home;
  if (
    combined.includes("book") ||
    combined.includes("station") ||
    combined.includes("print") ||
    combined.includes("paper") ||
    combined.includes("art")
  )
    return vendorCardThemes.books;
  if (
    combined.includes("service") ||
    combined.includes("consult") ||
    combined.includes("repair") ||
    combined.includes("agency")
  )
    return vendorCardThemes.services;
  return vendorCardThemes.default;
}

export function getVendorStoreUrl(slug: string) {
  const cleanSlug = (slug || "").trim().replace(/^\/+|\/+$/g, "");
  return `${ZANGO_STORE_ORIGIN}/store/${cleanSlug}`;
}

export function getVendorStoreDisplayUrl(slug: string) {
  const cleanSlug = (slug || "").trim().replace(/^\/+|\/+$/g, "");
  return `zango-connect.vercel.app/store/${cleanSlug}`;
}
