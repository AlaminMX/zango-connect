import {
  Shirt,
  UtensilsCrossed,
  Sparkles,
  Sofa,
  Palette,
  HandHelping,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

// Hausa translations for category names (light accents only)
export const CATEGORY_HAUSA: Record<string, string> = {
  "Food & Drinks": "Abinci",
  "Fashion": "Kayan Moda",
  "Beauty": "Kyau",
  "Home": "Gida",
  "Home & Living": "Gida",
  "Crafts": "Sana'a",
  "Services": "Hidima",
  "Other": "Sauran",
};

export type CategoryIcon = {
  icon: LucideIcon;
  // tailwind tint background + foreground used inside category card badge
  tint: string;
};

export const CATEGORY_ICON: Record<string, CategoryIcon> = {
  Fashion: { icon: Shirt, tint: "bg-rose/30 text-primary" },
  "Food & Drinks": { icon: UtensilsCrossed, tint: "bg-amber-100 text-amber-700" },
  Beauty: { icon: Sparkles, tint: "bg-pink-100 text-pink-700" },
  Home: { icon: Sofa, tint: "bg-secondary text-primary" },
  "Home & Living": { icon: Sofa, tint: "bg-secondary text-primary" },
  Crafts: { icon: Palette, tint: "bg-orange-100 text-orange-700" },
  Services: { icon: HandHelping, tint: "bg-emerald-100 text-emerald-700" },
  Other: { icon: ShoppingBag, tint: "bg-muted text-muted-foreground" },
};

export function iconFor(name?: string | null): CategoryIcon {
  if (!name) return CATEGORY_ICON.Other;
  return CATEGORY_ICON[name] ?? CATEGORY_ICON.Other;
}

// Comprehensive Northern Nigerian city list, alphabetical, "Other" last.
export const NIGERIAN_CITIES = [
  "Abuja",
  "Azare",
  "Bauchi",
  "Birnin Kebbi",
  "Dutse",
  "Funtua",
  "Gombe",
  "Gusau",
  "Hadejia",
  "Ilorin",
  "Jalingo",
  "Jos",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kontagora",
  "Lafia",
  "Maiduguri",
  "Minna",
  "Potiskum",
  "Sokoto",
  "Yola",
  "Zaria",
  "Other",
];

export function hausaFor(name?: string | null): string | null {
  if (!name) return null;
  return CATEGORY_HAUSA[name] ?? null;
}
