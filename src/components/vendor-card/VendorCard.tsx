import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Heart, MapPin, Phone, ShieldCheck, ShoppingBag, Star } from "lucide-react";

import { VerifiedBadge } from "@/components/VerifiedBadge";
import { cn } from "@/lib/utils";
import {
  getVendorStoreUrl,
  resolveVendorCardTheme,
  vendorCardFormats,
} from "@/lib/vendor-card/themes";
import type { VendorCardProps, VendorCardProduct, VendorCardVendor } from "@/lib/vendor-card/types";

function formatPhoneNumber(num?: string | null) {
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

function formatLocation(city?: string | null) {
  if (!city || !city.trim()) return "Nigeria";
  const c = city.trim();
  if (c.toLowerCase().includes("nigeria")) return c;
  return `${c}, Nigeria`;
}

function getOfferings(
  category?: string | null,
  products: VendorCardProduct[] = [],
  defaultOfferings: string[] = ["Fashion", "Accessories", "Bags"],
) {
  const items: string[] = [];
  if (category) {
    items.push(category.charAt(0).toUpperCase() + category.slice(1));
  }
  for (const p of products) {
    if (!p.name) continue;
    const words = p.name.trim().split(" ");
    const candidate = words[0];
    if (
      candidate &&
      candidate.length > 2 &&
      !items.some((it) => it.toLowerCase() === candidate.toLowerCase())
    ) {
      items.push(candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase());
    }
    if (items.length >= 3) break;
  }
  for (const def of defaultOfferings) {
    if (items.length >= 3) break;
    if (!items.some((it) => it.toLowerCase() === def.toLowerCase())) {
      items.push(def);
    }
  }
  return items.slice(0, 3).join(" • ");
}

function VendorLogoBadge({
  vendor,
  className,
}: {
  vendor: VendorCardVendor;
  className?: string;
}) {
  const [imgError, setImgError] = React.useState(false);
  const letter = (vendor.business_name || "Z").trim().charAt(0).toUpperCase();
  const nameParts = (vendor.business_name || "").trim().split(" ");
  const firstName = nameParts[0] || "";
  const secondName = nameParts.slice(1).join(" ") || "";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border-[3.5px] border-[#C5A059] shadow-xl",
        className,
      )}
      style={{ backgroundColor: "#102419" }}
    >
      {vendor.profile_photo_url && !imgError ? (
        <img
          src={vendor.profile_photo_url}
          alt={vendor.business_name}
          className="h-full w-full object-cover rounded-full"
          crossOrigin="anonymous"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="relative flex h-full w-full flex-col items-center justify-center p-2 text-center select-none">
          {/* Subtle inner gold ring */}
          <div className="absolute inset-1.5 rounded-full border border-[#D4AF37]/35 pointer-events-none" />

          {/* Botanical laurel branches framing monogram */}
          <svg
            viewBox="0 0 120 120"
            className="absolute inset-0 h-full w-full pointer-events-none"
            fill="none"
          >
            {/* Delicate circular wreath stem */}
            <circle
              cx="60"
              cy="48"
              r="25"
              stroke="#C5A059"
              strokeWidth="1.1"
              strokeDasharray="2 1.5"
              opacity="0.8"
            />
            {/* Left laurel leaves */}
            <g fill="#C5A059" opacity="0.9">
              <path d="M 41 33 C 37 29 34 25 32 21 C 35 23 39 27 42 30 Z" />
              <path d="M 36 43 C 31 41 27 39 24 36 C 28 37 32 40 36 42 Z" />
              <path d="M 35 55 C 30 56 26 57 23 57 C 26 55 30 54 35 53 Z" />
              <path d="M 39 66 C 34 69 31 72 29 76 C 31 73 35 70 40 67 Z" />
            </g>
            {/* Right laurel leaves */}
            <g fill="#C5A059" opacity="0.9">
              <path d="M 79 33 C 83 29 86 25 88 21 C 85 23 81 27 78 30 Z" />
              <path d="M 84 43 C 89 41 93 39 96 36 C 92 37 88 40 84 42 Z" />
              <path d="M 85 55 C 90 56 94 57 97 57 C 94 55 90 54 85 53 Z" />
              <path d="M 81 66 C 86 69 89 72 91 76 C 89 73 85 70 80 67 Z" />
            </g>
          </svg>

          {/* Large Serif Monogram Letter */}
          <span className="font-serif text-[46px] leading-none text-[#C5A059] font-bold drop-shadow-sm z-10">
            {letter}
          </span>

          {/* Business Name beneath monogram */}
          <div className="z-10 mt-1 flex flex-col items-center leading-none px-1">
            <span className="font-serif text-[12px] uppercase tracking-[0.2em] text-[#C5A059] font-bold max-w-[120px] truncate text-center">
              {firstName}
            </span>
            {secondName && (
              <span className="font-sans text-[9px] uppercase tracking-[0.22em] text-[#D4AF37]/90 max-w-[110px] truncate mt-0.5 text-center font-bold">
                {secondName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const VendorCard = React.forwardRef<HTMLDivElement, VendorCardProps>(
  (
    {
      vendor,
      products = [],
      theme,
      format = "landscape",
      className,
      selectedProductIndex,
      selectedImageUrl,
    },
    ref,
  ) => {
    const resolvedTheme = resolveVendorCardTheme(vendor.category, theme);
    const dimensions = vendorCardFormats[format];
    const storeUrl = getVendorStoreUrl(vendor.slug);
    const isVertical = dimensions.height / dimensions.width > 1.1;

    // Available showcase images from vendor products, cover photo, or theme fallback
    const availableImages = React.useMemo(() => {
      const list: { url: string; label: string }[] = [];
      products.forEach((p, idx) => {
        const url = p.image_urls?.[0] || p.image_url;
        if (url) {
          list.push({ url, label: p.name || `Product #${idx + 1}` });
        }
      });
      if (vendor.cover_photo_url) {
        list.push({ url: vendor.cover_photo_url, label: "Store Cover Photo" });
      }
      if (resolvedTheme.lifestyleImage) {
        list.push({ url: resolvedTheme.lifestyleImage, label: "Editorial Lifestyle" });
      }
      return list;
    }, [products, vendor.cover_photo_url, resolvedTheme.lifestyleImage]);

    // Active showcase hero image (controllable via selectedProductIndex or selectedImageUrl)
    const heroImage =
      selectedImageUrl ||
      (selectedProductIndex !== undefined && availableImages[selectedProductIndex]?.url) ||
      availableImages[0]?.url ||
      resolvedTheme.lifestyleImage;

    const offerings = getOfferings(vendor.category, products, resolvedTheme.defaultOfferings);
    const bioText = vendor.bio?.trim()
      ? `"${vendor.bio}"`
      : resolvedTheme.defaultTagline || "Timeless style, just for you.";
    const nameWords = (vendor.business_name || "Store Name").trim().split(/\s+/).filter(Boolean);

    // ─────────────────────────────────────────────────────────────
    // 1:1 PROFILE PICTURE / SOCIAL AVATAR FORMAT (1080x1080)
    // Designed with a circular safe-zone so WhatsApp & social media
    // apps crop into a circle without cutting off any text or badge.
    // ─────────────────────────────────────────────────────────────
    if (format === "profile-picture") {
      return (
        <div
          ref={ref}
          className={cn(
            "relative isolate flex flex-col items-center justify-between overflow-hidden bg-[#FAF6F0] text-[#24150E] shadow-2xl select-none text-center",
            className,
          )}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: 72,
          }}
        >
          {/* Subtle concentric circular boundary guide */}
          <div className="absolute inset-8 rounded-full border-[3px] border-[#D4AF37]/35 pointer-events-none" />
          <div className="absolute inset-12 rounded-full border border-[#D6BEA8]/30 pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10 pt-10 flex flex-col items-center">
            <div className="flex items-center gap-4.5">
              <img
                src="/zango-logo.png"
                alt="ZANGO"
                className="h-30 w-30 h-[120px] w-[120px] object-contain shrink-0"
                crossOrigin="anonymous"
              />
              <div className="text-left whitespace-nowrap flex flex-col justify-center">
                <p className="font-sans text-[44px] font-black tracking-[0.2em] text-[#24150E] leading-none uppercase whitespace-nowrap">
                  ZANGO
                </p>
                <p className="text-[20px] font-bold tracking-wide text-[#7C6556] mt-1.5 whitespace-nowrap">
                  Discover. Support. Empower.
                </p>
              </div>
            </div>
          </div>

          {/* Center: Hero Avatar & Vendor Info */}
          <div className="relative z-10 flex flex-col items-center px-12 max-w-[920px]">
            {/* Large Gold-Framed Avatar */}
            <div className="relative">
              <VendorLogoBadge vendor={vendor} className="h-56 w-56 shadow-2xl" />
              {vendor.is_verified && (
                <div className="absolute bottom-1 right-1 grid h-14 w-14 place-items-center rounded-full bg-[#C5A059] text-white shadow-lg border-2 border-[#FAF6F0]">
                  <CheckCircle2 className="h-8 w-8 fill-current" />
                </div>
              )}
            </div>

            {/* Category Pill */}
            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-[#804723] px-6 py-2.5 text-[18px] font-black uppercase tracking-wider text-white shadow-md">
              <ShoppingBag className="h-5.5 w-5.5" />
              <span>{vendor.category || resolvedTheme.badge}</span>
            </div>

            {/* Business Name - 50px */}
            <h1 className="mt-3.5 font-serif text-[50px] leading-[1.05] tracking-tight text-[#24150E] max-w-[840px] truncate font-black">
              {vendor.business_name}
            </h1>

            {/* Location & Specialty */}
            <div className="mt-3 flex items-center gap-3.5 text-[28px] font-bold text-[#7C6556]">
              <MapPin className="h-7 w-7 text-[#804723]" />
              <span>{formatLocation(vendor.city)}</span>
              <span>•</span>
              <span className="text-[#804723] font-black">
                {vendor.is_verified ? "Verified Vendor" : "Zango Merchant"}
              </span>
            </div>

            {/* Accurate Store URL Pill */}
            <div className="mt-5 inline-flex items-center rounded-full bg-[#3A2013] px-8 py-3 text-[20px] font-bold text-white shadow-md">
              <span>zango.com/{vendor.slug}</span>
            </div>
          </div>

          {/* Bottom Bar within circular safe zone - 30px text, 32px icons */}
          <div className="relative z-10 pb-14 flex items-center gap-8 text-[30px] font-extrabold text-[#523321]">
            <div className="flex items-center gap-3">
              <Heart className="h-[32px] w-[32px] text-[#C5A059]" />
              <span>Shop Local</span>
            </div>
            <div className="h-7 w-px bg-[#D6BEA8]" />
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-[32px] w-[32px] text-[#C5A059]" />
              <span>Trusted Seller</span>
            </div>
            <div className="h-7 w-px bg-[#D6BEA8]" />
            <div className="flex items-center gap-3">
              <Star className="h-[32px] w-[32px] text-[#C5A059]" />
              <span>Empowering Women</span>
            </div>
          </div>
        </div>
      );
    }

    if (isVertical) {
      // VERTICAL LAYOUT (Instagram Story, Portrait, Status)
      return (
        <div
          ref={ref}
          className={cn(
            "relative isolate flex flex-col overflow-hidden bg-[#FAF6F0] text-[#24150E] shadow-2xl",
            className,
          )}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: 36,
          }}
        >
          {/* Faint watermark */}
          <div className="absolute -left-20 top-20 text-[280px] font-black tracking-tighter text-[#EFE7DC]/50 pointer-events-none select-none">
            Z
          </div>

          {/* Top: Header with Zango logo - h-30 w-30 logo */}
          <div className="relative z-10 flex items-center justify-between px-10 pt-10 pb-2">
            <div className="flex items-center gap-4.5">
              <img
                src="/zango-logo.png"
                alt="ZANGO"
                className="h-30 w-30 h-[120px] w-[120px] object-contain drop-shadow-sm shrink-0"
                crossOrigin="anonymous"
              />
              <div className="text-left whitespace-nowrap flex flex-col justify-center">
                <p className="font-sans text-[44px] font-black tracking-[0.2em] text-[#24150E] leading-none uppercase whitespace-nowrap">
                  ZANGO
                </p>
                <p className="text-[20px] font-bold tracking-wide text-[#7C6556] mt-1 whitespace-nowrap">
                  Discover. Support. Empower.
                </p>
              </div>
            </div>
            {vendor.is_verified && <VerifiedBadge className="h-12 w-12" />}
          </div>

          {/* Vendor Details */}
          <div className="relative z-10 px-10 py-5">
            <div className="flex items-center gap-5">
              <VendorLogoBadge vendor={vendor} className="h-40 w-40" />
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 rounded-lg bg-[#804723] px-5 py-2 text-[18px] font-black uppercase tracking-wider text-white shadow-sm">
                  <ShoppingBag className="h-5 w-5" />
                  <span>{vendor.category || resolvedTheme.badge}</span>
                </div>
                {/* Business Name - 50px */}
                <h1 className="mt-2.5 font-serif text-[50px] leading-[1.04] tracking-tight text-[#24150E] font-black">
                  {vendor.business_name}
                </h1>
              </div>
            </div>

            <p className="mt-3.5 font-serif text-[24px] italic leading-snug text-[#784A33] font-semibold">{bioText}</p>

            <div className="my-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-[#D9C6B6]" />
              <div className="h-2 w-2 rotate-45 bg-[#9E6F4E]" />
              <div className="h-px flex-1 bg-[#D9C6B6]" />
            </div>

            <div className="grid gap-3.5 text-[28px] font-bold text-[#24150E]">
              <div className="flex items-center gap-4 border-b border-dashed border-[#D9C6B6] pb-3">
                <div className="grid h-13 w-13 shrink-0 place-items-center rounded-full bg-[#4A2C1D] text-white shadow-sm">
                  <MapPin className="h-7 w-7 text-[#F5EFE6]" />
                </div>
                <span>{formatLocation(vendor.city)}</span>
              </div>
              <div className="flex items-center gap-4 border-b border-dashed border-[#D9C6B6] pb-3">
                <div className="grid h-13 w-13 shrink-0 place-items-center rounded-full bg-[#4A2C1D] text-white shadow-sm">
                  <ShoppingBag className="h-7 w-7 text-[#F5EFE6]" />
                </div>
                <span>{offerings}</span>
              </div>
              <div className="flex items-center gap-4 border-b border-dashed border-[#D9C6B6] pb-3">
                <div className="grid h-13 w-13 shrink-0 place-items-center rounded-full bg-[#4A2C1D] text-white shadow-sm">
                  <Phone className="h-7 w-7 text-[#F5EFE6]" />
                </div>
                <span>{formatPhoneNumber(vendor.whatsapp_number)}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="grid h-13 w-13 shrink-0 place-items-center rounded-full bg-[#4A2C1D] text-white shadow-sm">
                  <ShieldCheck className="h-7 w-7 text-[#F5EFE6]" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span>{vendor.is_verified ? "Verified Vendor" : "Registered Vendor"}</span>
                  {vendor.is_verified && (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-[#C5A059] text-white shadow-sm">
                      <CheckCircle2 className="h-5 w-5 fill-current" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hero Lifestyle Showcase */}
          <div className="relative mx-10 my-4 flex-1 overflow-hidden rounded-[30px] border-2 border-[#D6BEA8] shadow-xl">
            <img
              src={heroImage}
              alt=""
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Floating Store Card inside hero */}
            <div className="absolute inset-x-6 bottom-6 z-20 flex items-center gap-5 rounded-[26px] border-2 border-[#E8D9C8] bg-white p-5 shadow-2xl">
              <div className="rounded-2xl border-2 border-[#804723] bg-white p-3 shadow-sm shrink-0">
                <QRCodeSVG
                  value={storeUrl}
                  size={144}
                  bgColor="#FFFFFF"
                  fgColor="#24150E"
                  level="M"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 text-[26px] font-black text-[#24150E]">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[#804723] text-white">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <span>Visit My Store</span>
                </div>
                <div className="mt-2 inline-block rounded-full bg-[#3A2013] px-5 py-2 text-[18px] font-bold text-white max-w-full truncate">
                  zango.com/{vendor.slug}
                </div>
                <p className="mt-2 text-[23px] font-semibold text-[#6E5A4E]">Scan to explore my products.</p>
              </div>
            </div>
          </div>

          {/* Bottom Dark Bar - Expanded size with 30px text, 32px icons, enlarged pill */}
          <div className="relative z-30 flex h-[110px] shrink-0 items-center justify-between bg-[#24150E] px-10 text-white shadow-2xl">
            <div className="flex items-center gap-6 text-[30px] font-extrabold tracking-wide">
              <div className="flex items-center gap-3">
                <Heart className="h-[32px] w-[32px] text-[#C5A059] stroke-[2.2]" />
                <span>Shop Local</span>
              </div>
              <div className="h-7 w-px bg-white/20" />
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-[32px] w-[32px] text-[#C5A059] stroke-[2.2]" />
                <span>Trusted Seller</span>
              </div>
              <div className="h-7 w-px bg-white/20" />
              <div className="flex items-center gap-3">
                <Star className="h-[32px] w-[32px] text-[#C5A059] stroke-[2.2]" />
                <span>Empowering Women</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-full bg-white px-7 py-3.5 text-[#24150E] shadow-xl">
              <span className="font-medium text-[#4A3B32] text-[19px]">Powered by</span>
              <img
                src="/zango-logo.png"
                alt=""
                className="h-[32px] w-[32px] object-contain"
                crossOrigin="anonymous"
              />
              <span className="font-sans font-black tracking-wider text-[22px] text-[#24150E]">ZANGO</span>
            </div>
          </div>
        </div>
      );
    }

    // LANDSCAPE SIGNATURE LAYOUT (Matches reference image)
    return (
      <div
        ref={ref}
        className={cn(
          "relative isolate overflow-hidden bg-[#FAF6F0] text-[#24150E] shadow-2xl select-none",
          className,
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: 36,
        }}
      >
        {/* Right Side: Hero Lifestyle / Product Photography */}
        <div className="absolute right-0 top-0 h-full w-[56%] overflow-hidden">
          <img
            src={heroImage}
            alt=""
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
          {/* Warm cinematic vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#24150E]/5 to-[#24150E]/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,transparent_45%,rgba(36,21,14,0.3)_100%)]" />
        </div>

        {/* Swooping Organic Wave Separator (SVG) */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none z-10"
          viewBox="0 0 1600 1000"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="creamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FAF6F0" />
              <stop offset="50%" stopColor="#F5EFE6" />
              <stop offset="100%" stopColor="#ECE1D1" />
            </linearGradient>
            <filter id="curveDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="12"
                dy="0"
                stdDeviation="16"
                floodColor="#24150E"
                floodOpacity="0.26"
              />
            </filter>
          </defs>

          {/* Outer elegant gold contour line */}
          <path
            d="M 1010 0 C 970 260, 840 460, 770 640 C 725 760, 705 850, 700 1000"
            fill="none"
            stroke="#C5A059"
            strokeWidth="2.5"
            opacity="0.85"
          />

          {/* Main cream panel with organic curve */}
          <path
            d="M 0 0 L 990 0 C 955 260, 825 460, 755 640 C 710 760, 690 850, 685 1000 L 0 1000 Z"
            fill="url(#creamGradient)"
            filter="url(#curveDropShadow)"
          />

          {/* Faint Zango brand watermark in background of cream panel */}
          <image
            href="/zango-logo.png"
            x="240"
            y="50"
            width="420"
            height="420"
            opacity="0.04"
          />
        </svg>

        {/* Left Column Content - Adjusted to accommodate 110px bottom bar */}
        <div className="relative z-20 flex h-[calc(100%-110px)] w-[54%] max-w-[860px] flex-col justify-between p-12 lg:p-14">
          {/* Top Left: Zango Brand Logo & Tagline - h-30 w-30 logo */}
          <div className="flex items-center gap-4">
            <img
              src="/zango-logo.png"
              alt="ZANGO"
              className="h-30 w-30 h-[120px] w-[120px] object-contain shrink-0"
              crossOrigin="anonymous"
            />
            <div className="text-left whitespace-nowrap flex flex-col justify-center">
              <p className="font-sans text-[44px] font-black tracking-[0.2em] text-[#24150E] leading-none uppercase">
                ZANGO
              </p>
              <p className="text-[20px] font-bold tracking-wide text-[#7C6556] mt-1.5">
                Discover. Support. Empower.
              </p>
            </div>
          </div>

          {/* Middle: Avatar + Category + Name + Tagline + 4 Info Points */}
          <div className="my-auto pr-2">
            <div className="flex items-center gap-6">
              <VendorLogoBadge vendor={vendor} className="h-44 w-44" />

              <div className="min-w-0 flex-1">
                {/* Category Pill */}
                <div className="inline-flex items-center gap-2 rounded-lg bg-[#804723] px-5 py-2 text-[18px] font-extrabold uppercase tracking-wider text-white shadow-md">
                  <ShoppingBag className="h-5 w-5" />
                  <span>{vendor.category || resolvedTheme.badge}</span>
                </div>

                {/* Business Name - Reduced to 50px display serif */}
                <h1 className="mt-3 font-serif text-[50px] leading-[1.04] tracking-tight text-[#24150E] font-black">
                  {nameWords.length >= 2 ? (
                    <>
                      <span className="block">{nameWords[0]}</span>
                      <span className="block">{nameWords.slice(1).join(" ")}</span>
                    </>
                  ) : (
                    vendor.business_name || "Store Name"
                  )}
                </h1>
              </div>
            </div>

            {/* Slogan / Bio */}
            <p className="mt-3.5 font-serif text-[26px] italic leading-snug text-[#784A33] max-w-xl font-semibold">
              {bioText}
            </p>

            {/* Ornamental Divider with Diamond */}
            <div className="my-3.5 flex max-w-[480px] items-center gap-2.5">
              <div className="h-px flex-1 bg-[#D9C6B6]" />
              <div className="h-2 w-2 rotate-45 bg-[#9E6F4E]" />
              <div className="h-px flex-1 bg-[#D9C6B6]" />
            </div>

            {/* 4 Info Rows - Explicitly 28px font size */}
            <div className="grid gap-3.5 max-w-[540px] text-[28px] font-bold text-[#24150E]">
              {/* Location */}
              <div className="flex items-center gap-4 border-b border-dashed border-[#D9C6B6] pb-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#4A2C1D] text-white shadow-md">
                  <MapPin className="h-7 w-7 text-[#F5EFE6]" />
                </div>
                <span>{formatLocation(vendor.city)}</span>
              </div>

              {/* Offerings */}
              <div className="flex items-center gap-4 border-b border-dashed border-[#D9C6B6] pb-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#4A2C1D] text-white shadow-md">
                  <ShoppingBag className="h-7 w-7 text-[#F5EFE6]" />
                </div>
                <span>{offerings}</span>
              </div>

              {/* Contact */}
              <div className="flex items-center gap-4 border-b border-dashed border-[#D9C6B6] pb-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#4A2C1D] text-white shadow-md">
                  <Phone className="h-7 w-7 text-[#F5EFE6]" />
                </div>
                <span>{formatPhoneNumber(vendor.whatsapp_number)}</span>
              </div>

              {/* Verification */}
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#4A2C1D] text-white shadow-md">
                  <ShieldCheck className="h-7 w-7 text-[#F5EFE6]" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span>{vendor.is_verified ? "Verified Vendor" : "Registered Vendor"}</span>
                  {vendor.is_verified && (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-[#C5A059] text-white shadow-md">
                      <CheckCircle2 className="h-5 w-5 fill-current" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating "Visit My Store" Card (Bottom Right) - Positioned cleanly above 110px bottom bar */}
        <div className="absolute right-10 bottom-[128px] z-20 flex items-center gap-5 rounded-[28px] border-2 border-[#E5D7C8] bg-white p-5 pr-6 shadow-[0_24px_50px_rgba(36,21,14,0.3)] max-w-[580px]">
          {/* QR Code inside brown-bordered rounded container */}
          <div className="rounded-[18px] border-2 border-[#804723] bg-white p-3.5 shadow-md shrink-0">
            <QRCodeSVG
              value={storeUrl}
              size={144}
              bgColor="#FFFFFF"
              fgColor="#24150E"
              level="M"
            />
          </div>

          {/* Store Info & CTA */}
          <div className="flex flex-col justify-center min-w-0 pr-1">
            <div className="flex items-center gap-2.5 text-[26px] font-black text-[#24150E]">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#804723] text-white shadow-xs">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="whitespace-nowrap tracking-tight">Visit My Store</span>
            </div>

            {/* URL Pill Button with clean domain matching reference */}
            <div className="mt-2 inline-flex items-center rounded-full bg-[#3A2013] px-5 py-2 text-[18px] font-bold tracking-wide text-white shadow-xs self-start max-w-[340px] truncate whitespace-nowrap">
              <span>zango.com/{vendor.slug || "hafsah"}</span>
            </div>

            {/* Subtitle with curved doodle arrow - 23px font size */}
            <div className="mt-2 flex items-center gap-2.5 text-[23px] leading-snug font-semibold text-[#6E5A4E]">
              <span className="max-w-[240px]">
                Scan to explore my products and shop with confidence.
              </span>
              <svg
                viewBox="0 0 36 36"
                className="h-10 w-10 shrink-0 text-[#C5A059]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M 30 6 C 28 20, 18 25, 7 25" />
                <polyline points="13 19 6 25 13 31" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Value Bar across full width - Increased bar size to 110px with 30px font, 32px icons, enlarged Powered by ZANGO pill */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex h-[110px] items-center justify-between bg-[#24150E] px-12 text-white shadow-2xl">
          <div className="flex items-center text-[30px] font-extrabold tracking-wide whitespace-nowrap">
            <div className="flex items-center gap-3.5">
              <Heart className="h-[32px] w-[32px] text-[#C5A059] stroke-[2.2]" />
              <span>Shop Local</span>
            </div>
            <div className="h-8 w-px bg-white/25 mx-8" />
            <div className="flex items-center gap-3.5">
              <ShieldCheck className="h-[32px] w-[32px] text-[#C5A059] stroke-[2.2]" />
              <span>Trusted Seller</span>
            </div>
            <div className="h-8 w-px bg-white/25 mx-8" />
            <div className="flex items-center gap-3.5">
              <Star className="h-[32px] w-[32px] text-[#C5A059] stroke-[2.2]" />
              <span>Empowering Women</span>
            </div>
          </div>

          {/* Powered by ZANGO Enlarged White Pill */}
          <div className="flex items-center gap-3 rounded-full bg-white px-8 py-3.5 text-[#24150E] shadow-xl whitespace-nowrap">
            <span className="font-semibold text-[#4A3B32] text-[20px]">Powered by</span>
            <img
              src="/zango-logo.png"
              alt=""
              className="h-[34px] w-[34px] object-contain"
              crossOrigin="anonymous"
            />
            <span className="font-sans font-black tracking-wider text-[24px] text-[#24150E]">ZANGO</span>
          </div>
        </div>
      </div>
    );
  },
);

VendorCard.displayName = "VendorCard";
