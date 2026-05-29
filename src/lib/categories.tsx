import React from "react";

// ---------------------------------------------------------------------------
// Hausa translations
// ---------------------------------------------------------------------------
export const CATEGORY_HAUSA: Record<string, string> = {
  "Home & Living": "Gida da Kayan Gida",
  "Jewelry & Accessories": "Kayan Ado",
  "Traditional Crafts": "Sana'ar Gargajiya",
  "Beauty & Personal Care": "Kyau da Kulawa",
  "Modest Fashion": "Tufafin Mace",
  "Food & Groceries": "Abinci da Kayan Miya",
  // legacy names kept for compat
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
  "Abuja","Azare","Bauchi","Birnin Kebbi","Dutse","Funtua","Gombe","Gusau",
  "Hadejia","Ilorin","Jalingo","Jos","Kaduna","Kano","Katsina","Kontagora",
  "Lafia","Maiduguri","Minna","Potiskum","Sokoto","Yola","Zaria","Other",
];

// ---------------------------------------------------------------------------
// Icon types
// ---------------------------------------------------------------------------
export type CategoryIconComponent = React.FC<{ size?: number; className?: string }>;
export type CategoryIconConfig = {
  Component: CategoryIconComponent;
  containerClass: string;
};

// ---------------------------------------------------------------------------
// SVG Icons — illustrated warm style matching Sutura Market design
// ---------------------------------------------------------------------------

const HomeAndLivingIcon: CategoryIconComponent = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* House frame outline */}
    <path d="M10 28 L28 12 L46 28" stroke="#C0601A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* House walls */}
    <rect x="15" y="27" width="26" height="18" rx="1" fill="none" stroke="#C0601A" strokeWidth="2" strokeLinejoin="round"/>
    {/* Door */}
    <rect x="23" y="33" width="10" height="12" rx="1.5" fill="none" stroke="#C0601A" strokeWidth="1.8"/>
    {/* Window left */}
    <rect x="17" y="30" width="5" height="5" rx="1" fill="none" stroke="#C0601A" strokeWidth="1.5"/>
    {/* Window right */}
    <rect x="34" y="30" width="5" height="5" rx="1" fill="none" stroke="#C0601A" strokeWidth="1.5"/>
    {/* Sofa inside house (decorative) */}
    {/* Lamp post left of house */}
    <line x1="9" y1="45" x2="9" y2="34" stroke="#C0601A" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M5 34 Q9 30 13 34" fill="#F5A623" stroke="#C0601A" strokeWidth="1.2"/>
    {/* Small plant right */}
    <line x1="47" y1="45" x2="47" y2="38" stroke="#8B4513" strokeWidth="1.5" strokeLinecap="round"/>
    <ellipse cx="47" cy="36" rx="3" ry="2.5" fill="#6B8E23" opacity="0.8"/>
    <ellipse cx="44" cy="37" rx="2" ry="1.8" fill="#6B8E23" opacity="0.7"/>
    <ellipse cx="50" cy="37" rx="2" ry="1.8" fill="#6B8E23" opacity="0.7"/>
  </svg>
);

const JewelryIcon: CategoryIconComponent = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Chain arc */}
    <path d="M14 18 Q28 10 42 18" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* Chain left side */}
    <path d="M14 18 Q11 26 16 32" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* Chain right side */}
    <path d="M42 18 Q45 26 40 32" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* Center connector */}
    <path d="M16 32 Q28 36 40 32" stroke="#D4A017" strokeWidth="2" strokeLinecap="round" fill="none"/>
    {/* Center teardrop pendant - large */}
    <ellipse cx="28" cy="40" rx="5" ry="7" fill="url(#jw-gold-main)"/>
    <ellipse cx="28" cy="37" rx="2.5" ry="2" fill="#FFE066" opacity="0.6"/>
    <line x1="28" y1="33" x2="28" y2="36" stroke="#D4A017" strokeWidth="1.5"/>
    {/* Left pendant */}
    <ellipse cx="18" cy="37" rx="3.5" ry="5" fill="url(#jw-gold-side)"/>
    <line x1="18" y1="32" x2="18" y2="33.5" stroke="#D4A017" strokeWidth="1.5"/>
    {/* Right pendant */}
    <ellipse cx="38" cy="37" rx="3.5" ry="5" fill="url(#jw-gold-side)"/>
    <line x1="38" y1="32" x2="38" y2="33.5" stroke="#D4A017" strokeWidth="1.5"/>
    {/* Sparkles */}
    <path d="M10 14 L10.8 11 L11.6 14 L10.8 17Z" fill="#F5C518" opacity="0.9"/>
    <path d="M44 11 L44.6 9 L45.2 11 L44.6 13Z" fill="#F5C518" opacity="0.8"/>
    <circle cx="46" cy="20" r="1.2" fill="#F5C518" opacity="0.7"/>
    <circle cx="9" cy="22" r="1" fill="#F5C518" opacity="0.7"/>
    <defs>
      <linearGradient id="jw-gold-main" x1="23" y1="33" x2="33" y2="47" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F5C518"/>
        <stop offset="1" stopColor="#B8860B"/>
      </linearGradient>
      <linearGradient id="jw-gold-side" x1="14" y1="32" x2="22" y2="42" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F5C518"/>
        <stop offset="1" stopColor="#B8860B"/>
      </linearGradient>
    </defs>
  </svg>
);

const TraditionalCraftsIcon: CategoryIconComponent = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Decorative plate/tray */}
    <ellipse cx="28" cy="44" rx="18" ry="4" fill="url(#tc-plate)"/>
    <ellipse cx="28" cy="44" rx="18" ry="4" fill="none" stroke="#A0522D" strokeWidth="1.2"/>
    {/* Plate inner ring */}
    <ellipse cx="28" cy="44" rx="13" ry="2.8" fill="none" stroke="#A0522D" strokeWidth="0.8" strokeDasharray="2 2"/>
    {/* Clay pot body */}
    <ellipse cx="28" cy="36" rx="11" ry="9" fill="url(#tc-pot-body)"/>
    {/* Pot neck */}
    <rect x="23" y="24" width="10" height="5" rx="1" fill="url(#tc-pot-neck)"/>
    {/* Pot lip/rim */}
    <ellipse cx="28" cy="24" rx="7" ry="2.2" fill="url(#tc-pot-rim)"/>
    {/* Pot handles */}
    <path d="M17 34 Q13 34 13 37 Q13 40 17 40" stroke="#8B4513" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    <path d="M39 34 Q43 34 43 37 Q43 40 39 40" stroke="#8B4513" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
    {/* Decorative lines on pot */}
    <path d="M19 34 Q28 32 37 34" stroke="#C0601A" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/>
    <path d="M18 37 Q28 35 38 37" stroke="#C0601A" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.6"/>
    {/* Highlight on pot */}
    <ellipse cx="23" cy="32" rx="3" ry="4" fill="white" opacity="0.2"/>
    <defs>
      <linearGradient id="tc-plate" x1="10" y1="44" x2="46" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DEB887"/>
        <stop offset="1" stopColor="#A0522D"/>
      </linearGradient>
      <linearGradient id="tc-pot-body" x1="17" y1="27" x2="39" y2="45" gradientUnits="userSpaceOnUse">
        <stop stopColor="#CD853F"/>
        <stop offset="1" stopColor="#8B4513"/>
      </linearGradient>
      <linearGradient id="tc-pot-neck" x1="23" y1="24" x2="33" y2="29" gradientUnits="userSpaceOnUse">
        <stop stopColor="#D2691E"/>
        <stop offset="1" stopColor="#8B4513"/>
      </linearGradient>
      <linearGradient id="tc-pot-rim" x1="21" y1="24" x2="35" y2="24" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DEB887"/>
        <stop offset="1" stopColor="#CD853F"/>
      </linearGradient>
    </defs>
  </svg>
);

const BeautyIcon: CategoryIconComponent = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Towel wrap on head */}
    <path d="M16 22 Q18 12 28 11 Q38 12 40 22 Q42 18 40 15 Q35 6 28 7 Q21 6 16 15 Q14 18 16 22Z" fill="url(#bt-towel)"/>
    {/* Towel twist/knot at top */}
    <ellipse cx="28" cy="12" rx="5" ry="3.5" fill="url(#bt-towel)" transform="rotate(-15 28 12)"/>
    <ellipse cx="32" cy="10" rx="3" ry="2.5" fill="#F4A0B0" transform="rotate(-30 32 10)"/>
    {/* Face shape */}
    <ellipse cx="28" cy="30" rx="11" ry="12" fill="url(#bt-skin)"/>
    {/* Neck */}
    <rect x="24" y="40" width="8" height="6" rx="2" fill="url(#bt-skin)"/>
    {/* Eyes */}
    <ellipse cx="23" cy="28" rx="2" ry="1.5" fill="#5C3317"/>
    <ellipse cx="33" cy="28" rx="2" ry="1.5" fill="#5C3317"/>
    {/* Eye shine */}
    <circle cx="24" cy="27.5" r="0.7" fill="white"/>
    <circle cx="34" cy="27.5" r="0.7" fill="white"/>
    {/* Eyebrows */}
    <path d="M20.5 25 Q23 23.5 25.5 25" stroke="#5C3317" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    <path d="M30.5 25 Q33 23.5 35.5 25" stroke="#5C3317" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
    {/* Nose */}
    <path d="M27 31 Q28 33 29 31" stroke="#C9956B" strokeWidth="1" strokeLinecap="round" fill="none"/>
    {/* Lips smile */}
    <path d="M24 35 Q28 38 32 35" stroke="#D9534F" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    {/* Hand/cotton pad applying to cheek */}
    <ellipse cx="38" cy="33" rx="4" ry="3.5" fill="white" stroke="#E8C4C4" strokeWidth="1"/>
    {/* Arm/hand */}
    <path d="M42 33 Q47 31 46 28" stroke="#C9956B" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    {/* Cheek blush dots */}
    <circle cx="20" cy="32" r="2.5" fill="#FFB6C1" opacity="0.5"/>
    <circle cx="36" cy="32" r="2.5" fill="#FFB6C1" opacity="0.5"/>
    <defs>
      <linearGradient id="bt-towel" x1="14" y1="7" x2="42" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFB6C1"/>
        <stop offset="1" stopColor="#FF8FAB"/>
      </linearGradient>
      <linearGradient id="bt-skin" x1="17" y1="18" x2="39" y2="46" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDDBB4"/>
        <stop offset="1" stopColor="#D4956A"/>
      </linearGradient>
    </defs>
  </svg>
);

const ModestFashionIcon: CategoryIconComponent = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Hijab/head covering */}
    <path d="M18 20 Q18 10 28 9 Q38 10 38 20 Q42 22 42 28 Q40 24 36 23 L34 45 L22 45 L20 23 Q16 24 14 28 Q14 22 18 20Z" fill="url(#mf-abaya)"/>
    {/* Face oval */}
    <ellipse cx="28" cy="19" rx="7.5" ry="8" fill="url(#mf-skin)"/>
    {/* Hijab framing face */}
    <path d="M18 20 Q18 28 20 30 L20 23 Q22 21 28 21 Q34 21 36 23 L36 30 Q38 28 38 20 Q35 17 28 17 Q21 17 18 20Z" fill="url(#mf-hijab-frame)"/>
    {/* Abaya body - flowing */}
    <path d="M20 23 Q16 26 13 35 Q11 42 14 47 L42 47 Q45 42 43 35 Q40 26 36 23 L34 45 L22 45 Z" fill="url(#mf-abaya)"/>
    {/* Subtle fold lines on abaya */}
    <path d="M24 28 Q23 36 24 45" stroke="#2C1810" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4"/>
    <path d="M32 28 Q33 36 32 45" stroke="#2C1810" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4"/>
    {/* Sleeves flowing */}
    <path d="M20 25 Q14 28 11 34 Q13 36 15 35 Q17 30 21 28Z" fill="url(#mf-abaya)"/>
    <path d="M36 25 Q42 28 45 34 Q43 36 41 35 Q39 30 35 28Z" fill="url(#mf-abaya)"/>
    {/* Face features */}
    <ellipse cx="24.5" cy="19" rx="1.5" ry="1.2" fill="#3C2415"/>
    <ellipse cx="31.5" cy="19" rx="1.5" ry="1.2" fill="#3C2415"/>
    <path d="M25.5 22.5 Q28 24 30.5 22.5" stroke="#C07050" strokeWidth="1" strokeLinecap="round" fill="none"/>
    <defs>
      <linearGradient id="mf-abaya" x1="11" y1="9" x2="45" y2="47" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4A2C17"/>
        <stop offset="1" stopColor="#1C0C05"/>
      </linearGradient>
      <linearGradient id="mf-hijab-frame" x1="18" y1="17" x2="38" y2="30" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3D2010"/>
        <stop offset="1" stopColor="#1C0C05"/>
      </linearGradient>
      <linearGradient id="mf-skin" x1="20" y1="11" x2="36" y2="27" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FDDBB4"/>
        <stop offset="1" stopColor="#D4956A"/>
      </linearGradient>
    </defs>
  </svg>
);

const FoodAndGroceriesIcon: CategoryIconComponent = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Pot body */}
    <ellipse cx="28" cy="38" rx="14" ry="10" fill="url(#fg-pot)"/>
    {/* Pot front face highlight */}
    <ellipse cx="24" cy="34" rx="4" ry="5" fill="white" opacity="0.12"/>
    {/* Pot rim */}
    <ellipse cx="28" cy="28" rx="14" ry="3.5" fill="url(#fg-rim)"/>
    {/* Pot handles */}
    <path d="M14 36 Q9 36 9 39 Q9 42 14 42" stroke="#A0522D" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <path d="M42 36 Q47 36 47 39 Q47 42 42 42" stroke="#A0522D" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    {/* Lid */}
    <ellipse cx="28" cy="27" rx="14" ry="3.5" fill="url(#fg-lid)"/>
    <ellipse cx="28" cy="25" rx="10" ry="2.5" fill="url(#fg-lid-top)"/>
    {/* Lid knob */}
    <ellipse cx="28" cy="23" rx="3" ry="1.8" fill="#D2691E"/>
    {/* Flying ingredients out of pot */}
    {/* Leaf/herb top-left */}
    <path d="M18 20 Q14 14 18 10 Q22 14 18 20Z" fill="#5F9E3A"/>
    <path d="M18 20 L18 10" stroke="#4A7A28" strokeWidth="1" strokeLinecap="round"/>
    {/* Tomato/round veggie top-right */}
    <circle cx="36" cy="12" r="5" fill="#E8443A"/>
    <path d="M34 8 Q36 6 38 8" stroke="#5F9E3A" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <ellipse cx="36" cy="12" rx="1.5" ry="3" fill="#C03028" opacity="0.4"/>
    {/* Small dot ingredients */}
    <circle cx="25" cy="9" r="2.5" fill="#F5A623"/>
    <circle cx="40" cy="20" r="2" fill="#5F9E3A" opacity="0.9"/>
    <circle cx="15" cy="24" r="1.8" fill="#E8443A" opacity="0.8"/>
    {/* Steam */}
    <path d="M23 26 Q22 22 23 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
    <path d="M28 25 Q27 20 28 17" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
    <path d="M33 26 Q34 22 33 19" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
    <defs>
      <linearGradient id="fg-pot" x1="14" y1="28" x2="42" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#E8935A"/>
        <stop offset="1" stopColor="#A0522D"/>
      </linearGradient>
      <linearGradient id="fg-rim" x1="14" y1="28" x2="42" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DEB887"/>
        <stop offset="1" stopColor="#CD853F"/>
      </linearGradient>
      <linearGradient id="fg-lid" x1="14" y1="24" x2="42" y2="31" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFB07A"/>
        <stop offset="1" stopColor="#C0722A"/>
      </linearGradient>
      <linearGradient id="fg-lid-top" x1="18" y1="23" x2="38" y2="28" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFD0A0"/>
        <stop offset="1" stopColor="#D4884A"/>
      </linearGradient>
    </defs>
  </svg>
);

// Fallback for unmapped categories
const OtherIcon: CategoryIconComponent = ({ size = 56 }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="56" height="56" rx="16" fill="url(#ot-bg)"/>
    <path d="M18 22 Q17 38 28 40 Q39 38 38 22 Z" fill="#fff" fillOpacity="0.9"/>
    <rect x="17" y="21" width="22" height="4" rx="1" fill="#fff"/>
    <path d="M21 21 Q21 15 28 15 Q35 15 35 21" stroke="#C4B5FD" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <defs>
      <linearGradient id="ot-bg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop stopColor="#C4B5FD"/>
        <stop offset="1" stopColor="#7C3AED"/>
      </linearGradient>
    </defs>
  </svg>
);

// ---------------------------------------------------------------------------
// Registry — new category names first, legacy names mapped for compat
// ---------------------------------------------------------------------------
export const CATEGORY_ICON: Record<string, CategoryIconConfig> = {
  "Home & Living": {
    Component: HomeAndLivingIcon,
    containerClass: "bg-amber-50",
  },
  "Jewelry & Accessories": {
    Component: JewelryIcon,
    containerClass: "bg-yellow-50",
  },
  "Traditional Crafts": {
    Component: TraditionalCraftsIcon,
    containerClass: "bg-orange-50",
  },
  "Beauty & Personal Care": {
    Component: BeautyIcon,
    containerClass: "bg-pink-50",
  },
  "Modest Fashion": {
    Component: ModestFashionIcon,
    containerClass: "bg-stone-50",
  },
  "Food & Groceries": {
    Component: FoodAndGroceriesIcon,
    containerClass: "bg-red-50",
  },
  // Legacy names
  Home: { Component: HomeAndLivingIcon, containerClass: "bg-amber-50" },
  Fashion: { Component: ModestFashionIcon, containerClass: "bg-stone-50" },
  "Food & Drinks": { Component: FoodAndGroceriesIcon, containerClass: "bg-red-50" },
  Beauty: { Component: BeautyIcon, containerClass: "bg-pink-50" },
  Crafts: { Component: TraditionalCraftsIcon, containerClass: "bg-orange-50" },
  Other: { Component: OtherIcon, containerClass: "bg-violet-50" },
};

export function iconFor(name?: string | null): CategoryIconConfig {
  if (!name) return CATEGORY_ICON.Other;
  return CATEGORY_ICON[name] ?? CATEGORY_ICON.Other;
}

export type { CategoryIconConfig as CategoryIcon };
