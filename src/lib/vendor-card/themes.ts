import type { VendorCardFormat, VendorCardTheme, VendorCardThemeName } from "./types";

export const ZANGO_STORE_ORIGIN = "https://zango-connect.vercel.app";

export const vendorCardFormats: Record<VendorCardFormat, { label: string; width: number; height: number; description: string }> = {
  "instagram-portrait": { label: "Instagram Portrait", width: 1080, height: 1350, description: "Best for feed posts" },
  story: { label: "Instagram Story", width: 1080, height: 1920, description: "Full-screen vertical story" },
  "whatsapp-status": { label: "WhatsApp Status", width: 1080, height: 1920, description: "Optimized for WhatsApp" },
  square: { label: "Square", width: 1080, height: 1080, description: "Universal social post" },
  landscape: { label: "Landscape", width: 1600, height: 1000, description: "Facebook and web banners" },
  "business-card": { label: "Business Card", width: 1050, height: 600, description: "Print-ready mini card" },
  "a4-flyer": { label: "A4 Flyer", width: 1240, height: 1754, description: "High-resolution flyer" },
};

export const vendorCardThemes: Record<VendorCardThemeName, VendorCardTheme> = {
  fashion: { name: "fashion", label: "Fashion Atelier", accent: "#9A513F", accentDeep: "#3E2723", glow: "#E8C8B8", heroGradient: "from-[#F7E7DD] via-[#E8C8B8] to-[#9A513F]", badge: "Wardrobe edit", lifestylePrompt: "Luxury leather bags, textured fabrics, sculptural shoes", motif: "FASHION" },
  beauty: { name: "beauty", label: "Beauty Ritual", accent: "#B55B75", accentDeep: "#4B2530", glow: "#F1CBD6", heroGradient: "from-[#FFF0F4] via-[#F1CBD6] to-[#B55B75]", badge: "Beauty ritual", lifestylePrompt: "Perfume, skincare, makeup flat lay with soft editorial lighting", motif: "BEAUTY" },
  food: { name: "food", label: "Culinary Studio", accent: "#A7632B", accentDeep: "#3E2723", glow: "#F1D0A8", heroGradient: "from-[#FFF5E8] via-[#F1D0A8] to-[#A7632B]", badge: "Freshly made", lifestylePrompt: "Professional food photography, warm table styling", motif: "FOOD" },
  electronics: { name: "electronics", label: "Modern Tech", accent: "#536878", accentDeep: "#1E2930", glow: "#D8E1E6", heroGradient: "from-[#F4F8FA] via-[#D8E1E6] to-[#536878]", badge: "Clean setup", lifestylePrompt: "Clean modern desk setup with premium devices", motif: "TECH" },
  automotive: { name: "automotive", label: "Auto Luxe", accent: "#6D4C41", accentDeep: "#211512", glow: "#D4C0B8", heroGradient: "from-[#F8F3EF] via-[#D4C0B8] to-[#6D4C41]", badge: "Auto detail", lifestylePrompt: "Luxury car accessories, polished leather, chrome accents", motif: "AUTO" },
  home: { name: "home", label: "Home Editorial", accent: "#8A7A52", accentDeep: "#3E3625", glow: "#DED6BE", heroGradient: "from-[#FBF8EF] via-[#DED6BE] to-[#8A7A52]", badge: "Home style", lifestylePrompt: "Elegant interior styling, neutral home decor", motif: "HOME" },
  books: { name: "books", label: "Reading Room", accent: "#7A4F35", accentDeep: "#332016", glow: "#DFCAB8", heroGradient: "from-[#FBF3EB] via-[#DFCAB8] to-[#7A4F35]", badge: "Reading list", lifestylePrompt: "Beautiful books, paper texture, reading room", motif: "BOOKS" },
  services: { name: "services", label: "Service Suite", accent: "#6F7350", accentDeep: "#2F3325", glow: "#D8DDBF", heroGradient: "from-[#F8FAEF] via-[#D8DDBF] to-[#6F7350]", badge: "Trusted service", lifestylePrompt: "Premium service desk, notebook, calm workspace", motif: "SERVICE" },
  default: { name: "default", label: "ZANGO Signature", accent: "#C05A3F", accentDeep: "#3E2723", glow: "#E8C8B8", heroGradient: "from-[#FCF9F5] via-[#E8C8B8] to-[#C05A3F]", badge: "Marketplace edit", lifestylePrompt: "Boutique marketplace product editorial", motif: "ZANGO" },
};

export function resolveVendorCardTheme(category?: string | null, preferred?: VendorCardThemeName): VendorCardTheme {
  if (preferred && vendorCardThemes[preferred]) return vendorCardThemes[preferred];
  const key = (category ?? "").toLowerCase();
  if (key.includes("fashion") || key.includes("cloth") || key.includes("shoe") || key.includes("bag")) return vendorCardThemes.fashion;
  if (key.includes("beauty") || key.includes("makeup") || key.includes("skin") || key.includes("perfume")) return vendorCardThemes.beauty;
  if (key.includes("food") || key.includes("drink") || key.includes("cater")) return vendorCardThemes.food;
  if (key.includes("elect") || key.includes("phone") || key.includes("gadget")) return vendorCardThemes.electronics;
  if (key.includes("auto") || key.includes("car")) return vendorCardThemes.automotive;
  if (key.includes("home") || key.includes("decor") || key.includes("interior")) return vendorCardThemes.home;
  if (key.includes("book")) return vendorCardThemes.books;
  if (key.includes("service")) return vendorCardThemes.services;
  return vendorCardThemes.default;
}

export function getVendorStoreUrl(slug: string) {
  return `${ZANGO_STORE_ORIGIN}/store/${slug}`;
}
