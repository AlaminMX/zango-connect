import React from "react";

// ---------------------------------------------------------------------------
// Hausa translations
// ---------------------------------------------------------------------------
export const CATEGORY_HAUSA: Record<string, string> = {
  "Home & Living": "Gida da Kayan Gida",
  "Food & Homemade Goods": "Abinci da Kayan Gida",
  "Fashion & Clothing": "Tufafin Mace",
  "Beauty & Skincare": "Kyau da Kulawa",
  "Crafts & Handmade": "Sana'ar Gargajiya",
  Accessories: "Kayan Ado",
  // legacy
  "Jewelry & Accessories": "Kayan Ado",
  "Traditional Crafts": "Sana'ar Gargajiya",
  "Beauty & Personal Care": "Kyau da Kulawa",
  "Modest Fashion": "Tufafin Mace",
  "Food & Groceries": "Abinci da Kayan Miya",
  "Food & Drinks": "Abinci",
  Fashion: "Kayan Moda",
  Beauty: "Kyau",
  Home: "Gida",
  Crafts: "Sana'a",
  Services: "Hidima",
  Electronics: "Na'urorin Lantarki",
  Other: "Sauran",
};

export function hausaFor(name?: string | null): string | null {
  if (!name) return null;
  return CATEGORY_HAUSA[name] ?? null;
}

// ---------------------------------------------------------------------------
// City list
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Types — image-based icons
// ---------------------------------------------------------------------------
export type CategoryIconComponent = React.FC<{ size?: number; className?: string }>;

export type CategoryIconConfig = {
  /** Path to the PNG icon (imported via ?url or direct import) */
  imgSrc: string;
  Component: CategoryIconComponent;
  containerClass: string;
};

// ---------------------------------------------------------------------------
// Image imports — Vite resolves these at build time
// ---------------------------------------------------------------------------
import homeImg from "@/assets/icons/home.png";
import accessoriesImg from "@/assets/icons/accessories.png";
import craftsImg from "@/assets/icons/crafts.png";
import beautyImg from "@/assets/icons/beauty.png";
import fashionImg from "@/assets/icons/fashion.png";
import foodImg from "@/assets/icons/food.png";

// ---------------------------------------------------------------------------
// Wrapper components so the existing <IconComponent size={n} /> call sites
// keep working without any changes to index.tsx / category.$slug.tsx
// ---------------------------------------------------------------------------
const makeImgIcon = (src: string, alt: string): CategoryIconComponent =>
  function IconImg({ size = 56 }) {
    return (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        style={{ objectFit: "contain", display: "block" }}
      />
    );
  };

const HomeIcon = makeImgIcon(homeImg, "Home & Living");
const AccessoriesIcon = makeImgIcon(accessoriesImg, "Accessories");
const CraftsIcon = makeImgIcon(craftsImg, "Crafts & Handmade");
const BeautyIcon = makeImgIcon(beautyImg, "Beauty & Skincare");
const FashionIcon = makeImgIcon(fashionImg, "Fashion & Clothing");
const FoodIcon = makeImgIcon(foodImg, "Food & Homemade Goods");

// ---------------------------------------------------------------------------
// Registry — actual DB names first, legacy aliases below
// ---------------------------------------------------------------------------
export const CATEGORY_ICON: Record<string, CategoryIconConfig> = {
  // ── Actual DB names ───────────────────────────────────────────────────────
  "Home & Living": { imgSrc: homeImg, Component: HomeIcon, containerClass: "bg-[#FDF3EC]" },
  Accessories: {
    imgSrc: accessoriesImg,
    Component: AccessoriesIcon,
    containerClass: "bg-[#FDF3EC]",
  },
  "Crafts & Handmade": { imgSrc: craftsImg, Component: CraftsIcon, containerClass: "bg-[#FDF3EC]" },
  "Beauty & Skincare": { imgSrc: beautyImg, Component: BeautyIcon, containerClass: "bg-[#FDF3EC]" },
  "Fashion & Clothing": {
    imgSrc: fashionImg,
    Component: FashionIcon,
    containerClass: "bg-[#FDF3EC]",
  },
  "Food & Homemade Goods": { imgSrc: foodImg, Component: FoodIcon, containerClass: "bg-[#FDF3EC]" },

  // ── Legacy / alternate names ──────────────────────────────────────────────
  Home: { imgSrc: homeImg, Component: HomeIcon, containerClass: "bg-[#FDF3EC]" },
  "Jewelry & Accessories": {
    imgSrc: accessoriesImg,
    Component: AccessoriesIcon,
    containerClass: "bg-[#FDF3EC]",
  },
  "Traditional Crafts": {
    imgSrc: craftsImg,
    Component: CraftsIcon,
    containerClass: "bg-[#FDF3EC]",
  },
  "Beauty & Personal Care": {
    imgSrc: beautyImg,
    Component: BeautyIcon,
    containerClass: "bg-[#FDF3EC]",
  },
  Beauty: { imgSrc: beautyImg, Component: BeautyIcon, containerClass: "bg-[#FDF3EC]" },
  "Modest Fashion": { imgSrc: fashionImg, Component: FashionIcon, containerClass: "bg-[#FDF3EC]" },
  Fashion: { imgSrc: fashionImg, Component: FashionIcon, containerClass: "bg-[#FDF3EC]" },
  "Food & Groceries": { imgSrc: foodImg, Component: FoodIcon, containerClass: "bg-[#FDF3EC]" },
  "Food & Drinks": { imgSrc: foodImg, Component: FoodIcon, containerClass: "bg-[#FDF3EC]" },
  Crafts: { imgSrc: craftsImg, Component: CraftsIcon, containerClass: "bg-[#FDF3EC]" },
};

const FALLBACK: CategoryIconConfig = {
  imgSrc: homeImg,
  Component: HomeIcon,
  containerClass: "bg-[#FDF3EC]",
};

export function iconFor(name?: string | null): CategoryIconConfig {
  if (!name) return FALLBACK;
  return CATEGORY_ICON[name] ?? FALLBACK;
}

export type { CategoryIconConfig as CategoryIcon };
