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
      style={{ backgroundColor: "#15281E" }}
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

          {/* Botanical laurel branches */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] text-[#D4AF37]/45"
            fill="currentColor"
          >
            <path d="M 30 70 C 22 56 22 40 30 26 C 28 32 24 42 27 52 C 28 58 30 64 30 70 Z" />
            <circle cx="24" cy="36" r="2.5" />
            <circle cx="22" cy="46" r="2.5" />
            <circle cx="25" cy="56" r="2.5" />
            <path d="M 70 70 C 78 56 78 40 70 26 C 72 32 76 42 73 52 C 72 58 70 64 70 70 Z" />
            <circle cx="76" cy="36" r="2.5" />
            <circle cx="78" cy="46" r="2.5" />
            <circle cx="75" cy="56" r="2.5" />
          </svg>

          {/* Large Serif Monogram Letter */}
          <span className="font-serif text-[48px] leading-none text-[#D4AF37] font-normal drop-shadow-sm z-10">
            {letter}
          </span>

          {/* Business Name beneath monogram */}
          <div className="z-10 mt-1 flex flex-col items-center leading-none px-1">
            <span className="font-serif text-[13px] uppercase tracking-[0.16em] text-[#D4AF37] font-bold max-w-[100px] truncate text-center">
              {firstName}
            </span>
            {secondName && (
              <span className="font-serif text-[11px] uppercase tracking-[0.12em] text-[#C5A059] max-w-[96px] truncate mt-0.5 text-center font-medium">
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
            "relative isolate flex flex-col items-center justify-between overflow-hidden bg-[#F7F2EB] text-[#24150E] shadow-2xl select-none text-center",
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
          <div className="relative z-10 pt-16 flex flex-col items-center">
            <div className="flex items-center gap-4">
              <img
                src="/zango-logo.png"
                alt="ZANGO"
                className="h-20 w-20 object-contain drop-shadow-sm"
                crossOrigin="anonymous"
              />
              <div className="text-left whitespace-nowrap">
                <p className="font-serif text-[32px] font-black tracking-[0.2em] text-[#24150E] leading-none uppercase whitespace-nowrap">
                  ZANGO
                </p>
                <p className="text-[14px] font-medium tracking-wide text-[#7C6556] mt-1.5 whitespace-nowrap">
                  Discover. Support. Empower.
                </p>
              </div>
            </div>
          </div>

          {/* Center: Hero Avatar & Vendor Info */}
          <div className="relative z-10 flex flex-col items-center px-16 max-w-[860px]">
            {/* Large Gold-Framed Avatar */}
            <div className="relative">
              <VendorLogoBadge vendor={vendor} className="h-44 w-44 shadow-2xl" />
              {vendor.is_verified && (
                <div className="absolute bottom-1 right-1 grid h-10 w-10 place-items-center rounded-full bg-[#C8A165] text-white shadow-lg border-2 border-[#F7F2EB]">
                  <CheckCircle2 className="h-6 w-6 fill-current" />
                </div>
              )}
            </div>

            {/* Category Pill */}
            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#804723] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>{vendor.category || resolvedTheme.badge}</span>
            </div>

            {/* Business Name */}
            <h1 className="mt-3 font-serif text-[46px] leading-[1.05] tracking-tight text-[#24150E] max-w-[760px] truncate">
              {vendor.business_name}
            </h1>

            {/* Location & Specialty */}
            <div className="mt-2 flex items-center gap-2 text-[16px] font-medium text-[#7C6556]">
              <MapPin className="h-4 w-4 text-[#804723]" />
              <span>{formatLocation(vendor.city)}</span>
              <span>•</span>
              <span className="text-[#804723] font-semibold">
                {vendor.is_verified ? "Verified Vendor" : "Zango Merchant"}
              </span>
            </div>

            {/* Accurate Store URL Pill */}
            <div className="mt-4 inline-flex items-center rounded-full bg-[#24150E] px-6 py-2 text-[14px] font-semibold text-white shadow-md">
              <span>zango-connect.vercel.app/store/{vendor.slug}</span>
            </div>
          </div>

          {/* Bottom Bar within circular safe zone */}
          <div className="relative z-10 pb-16 flex items-center gap-8 text-[14px] font-medium text-[#523321]">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-[#C5A059]" />
              <span>Shop Local</span>
            </div>
            <div className="h-4 w-px bg-[#D6BEA8]" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#C5A059]" />
              <span>Trusted Seller</span>
            </div>
            <div className="h-4 w-px bg-[#D6BEA8]" />
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-[#C5A059]" />
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
            "relative isolate flex flex-col overflow-hidden bg-[#F7F2EB] text-[#24150E] shadow-2xl",
            className,
          )}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: 36,
          }}
        >
          {/* Faint watermark */}
          <div className="absolute -left-20 top-20 text-[260px] font-black tracking-tighter text-[#EFE7DC]/50 pointer-events-none select-none">
            Z
          </div>

          {/* Top: Header with enlarged Zango logo */}
          <div className="relative z-10 flex items-center justify-between p-10 pb-4">
            <div className="flex items-center gap-4">
              <img
                src="/zango-logo.png"
                alt="ZANGO"
                className="h-20 w-20 object-contain drop-shadow-sm"
                crossOrigin="anonymous"
              />
              <div className="text-left whitespace-nowrap">
                <p className="font-serif text-[32px] font-black tracking-[0.2em] text-[#24150E] leading-none uppercase whitespace-nowrap">
                  ZANGO
                </p>
                <p className="text-[14px] font-medium tracking-wide text-[#7C6556] mt-1.5 whitespace-nowrap">
                  Discover. Support. Empower.
                </p>
              </div>
            </div>
            {vendor.is_verified && <VerifiedBadge className="h-8 w-8" />}
          </div>

          {/* Vendor Details */}
          <div className="relative z-10 px-10 py-6">
            <div className="flex items-center gap-5">
              <VendorLogoBadge vendor={vendor} className="h-28 w-28" />
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#804723] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>{vendor.category || resolvedTheme.badge}</span>
                </div>
                <h1 className="mt-2.5 font-serif text-[40px] leading-[1.08] tracking-tight text-[#24150E]">
                  {vendor.business_name}
                </h1>
              </div>
            </div>

            <p className="mt-4 font-serif text-xl italic leading-snug text-[#784A33]">{bioText}</p>

            <div className="my-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-[#D9C6B6]" />
              <div className="h-1.5 w-1.5 rotate-45 bg-[#9E6F4E]" />
              <div className="h-px flex-1 bg-[#D9C6B6]" />
            </div>

            <div className="grid gap-3 text-[15px] font-medium text-[#422B1E]">
              <div className="flex items-center gap-3.5 border-b border-dashed border-[#DFCEBD] pb-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#523321] text-white shadow-sm">
                  <MapPin className="h-4 w-4 text-[#F5EFE6]" />
                </div>
                <span>{formatLocation(vendor.city)}</span>
              </div>
              <div className="flex items-center gap-3.5 border-b border-dashed border-[#DFCEBD] pb-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#523321] text-white shadow-sm">
                  <ShoppingBag className="h-4 w-4 text-[#F5EFE6]" />
                </div>
                <span>{offerings}</span>
              </div>
              <div className="flex items-center gap-3.5 border-b border-dashed border-[#DFCEBD] pb-2">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#523321] text-white shadow-sm">
                  <Phone className="h-4 w-4 text-[#F5EFE6]" />
                </div>
                <span>{formatPhoneNumber(vendor.whatsapp_number)}</span>
              </div>
              <div className="flex items-center gap-3.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#523321] text-white shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-[#F5EFE6]" />
                </div>
                <div className="flex items-center gap-2">
                  <span>{vendor.is_verified ? "Verified Vendor" : "Registered Vendor"}</span>
                  {vendor.is_verified && (
                    <div className="grid h-5 w-5 place-items-center rounded-full bg-[#C8A165] text-white shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 fill-current" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hero Lifestyle Showcase */}
          <div className="relative mx-10 my-4 flex-1 overflow-hidden rounded-[32px] border-[2px] border-[#D6BEA8] shadow-xl">
            <img
              src={heroImage}
              alt=""
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Floating Store Card inside hero - Solid background and sharp borders with ZERO blur artifact on export */}
            <div className="absolute inset-x-5 bottom-5 z-20 flex items-center gap-4 rounded-3xl border-2 border-[#E8D9C8] bg-white p-3.5 shadow-lg">
              <div className="rounded-xl border border-[#E8D9C8] bg-white p-2 shadow-sm shrink-0">
                <QRCodeSVG
                  value={storeUrl}
                  size={88}
                  bgColor="#FFFFFF"
                  fgColor="#24150E"
                  level="M"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#24150E]">
                  <ShoppingBag className="h-3 w-3 text-[#7A4526]" />
                  <span>Visit My Store</span>
                </div>
                <div className="mt-1.5 inline-block rounded-full bg-[#4A2C1D] px-3.5 py-1 text-xs font-semibold text-white max-w-full truncate">
                  zango-connect.vercel.app/store/{vendor.slug}
                </div>
                <p className="mt-1.5 text-[11px] text-[#6E5A4E]">Scan to explore my products.</p>
              </div>
            </div>
          </div>

          {/* Bottom Dark Bar */}
          <div className="relative z-30 flex h-16 shrink-0 items-center justify-between bg-[#24150E] px-10 text-white">
            <div className="flex items-center gap-6 text-[12px] font-medium tracking-wide">
              <div className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-[#E2BA7A]" />
                <span>Shop Local</span>
              </div>
              <div className="h-3.5 w-px bg-white/20" />
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#E2BA7A]" />
                <span>Trusted Seller</span>
              </div>
              <div className="h-3.5 w-px bg-white/20" />
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-[#E2BA7A]" />
                <span>Empowering Women</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-[11px] font-bold text-[#24150E]">
              <span className="font-normal text-[#6E5A4E]">Powered by</span>
              <img
                src="/zango-logo.png"
                alt=""
                className="h-5 w-5 object-contain"
                crossOrigin="anonymous"
              />
              <span className="font-serif font-black tracking-wider text-[#24150E]">ZANGO</span>
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
          "relative isolate overflow-hidden bg-[#F7F2EB] text-[#24150E] shadow-2xl select-none",
          className,
        )}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: 36,
        }}
      >
        {/* Right Side: Hero Lifestyle / Product Photography */}
        <div className="absolute right-0 top-0 h-full w-[60%] overflow-hidden">
          <img
            src={heroImage}
            alt=""
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
          {/* Warm cinematic vignette overlay */}
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#24150E]/10 to-[#24150E]/40" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,transparent_40%,rgba(36,21,14,0.35)_100%)]" />
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
              <stop offset="55%" stopColor="#F5EFE6" />
              <stop offset="100%" stopColor="#EDE3D5" />
            </linearGradient>
            <filter id="curveDropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="10"
                dy="0"
                stdDeviation="14"
                floodColor="#24150E"
                floodOpacity="0.25"
              />
            </filter>
          </defs>

          {/* Outer elegant contour line */}
          <path
            d="M 900 0 C 875 260, 770 480, 698 700 C 668 820, 656 920, 652 1000"
            fill="none"
            stroke="#D6BEA8"
            strokeWidth="2.5"
            opacity="0.9"
          />

          {/* Main cream panel with organic curve */}
          <path
            d="M 0 0 L 880 0 C 855 260, 750 480, 678 700 C 648 820, 636 920, 632 1000 L 0 1000 Z"
            fill="url(#creamGradient)"
            filter="url(#curveDropShadow)"
          />

          {/* Faint watermark graphic in background of cream panel */}
          <g opacity="0.04" fill="#24150E">
            <path d="M 400 150 L 520 380 H 460 L 400 260 L 420 380 H 360 L 300 380 Z" />
          </g>
        </svg>

        {/* Left Column Content */}
        <div className="relative z-20 flex h-[calc(100%-64px)] w-[52%] max-w-[800px] flex-col justify-between p-12 lg:p-14">
          {/* Top Left: Enlarged Zango Brand Logo & Tagline */}
          <div className="flex items-center gap-4.5">
            <img
              src="/zango-logo.png"
              alt="ZANGO"
              className="h-24 w-24 object-contain drop-shadow-sm"
              crossOrigin="anonymous"
            />
            <div className="text-left whitespace-nowrap">
              <p className="font-serif text-[36px] font-black tracking-[0.22em] text-[#24150E] leading-none uppercase whitespace-nowrap">
                ZANGO
              </p>
              <p className="text-[16px] font-medium tracking-wide text-[#7C6556] mt-2 whitespace-nowrap">
                Discover. Support. Empower.
              </p>
            </div>
          </div>

          {/* Middle: Avatar + Category + Name + Tagline + 4 Info Points */}
          <div className="my-auto pr-4">
            <div className="flex items-center gap-5">
              <VendorLogoBadge vendor={vendor} className="h-32 w-32" />

              <div className="min-w-0 flex-1">
                {/* Category Pill */}
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#804723] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>{vendor.category || resolvedTheme.badge}</span>
                </div>

                {/* Business Name */}
                <h1 className="mt-2.5 font-serif text-[44px] leading-[1.06] tracking-tight text-[#24150E] line-clamp-2">
                  {vendor.business_name || "Store Name"}
                </h1>
              </div>
            </div>

            {/* Slogan / Bio */}
            <p className="mt-4 font-serif text-[22px] italic leading-snug text-[#784A33] max-w-lg">
              {bioText}
            </p>

            {/* Ornamental Divider with Diamond */}
            <div className="my-5 flex max-w-md items-center gap-2">
              <div className="h-px flex-1 bg-[#D9C6B6]" />
              <div className="h-1.5 w-1.5 rotate-45 bg-[#9E6F4E]" />
              <div className="h-px flex-1 bg-[#D9C6B6]" />
            </div>

            {/* 4 Info Rows */}
            <div className="grid gap-3.5 max-w-lg text-[16px] font-medium text-[#422B1E]">
              {/* Location */}
              <div className="flex items-center gap-3.5 border-b border-dashed border-[#DFCEBD] pb-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#523321] text-white shadow-sm">
                  <MapPin className="h-4.5 w-4.5 text-[#F5EFE6]" />
                </div>
                <span>{formatLocation(vendor.city)}</span>
              </div>

              {/* Offerings */}
              <div className="flex items-center gap-3.5 border-b border-dashed border-[#DFCEBD] pb-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#523321] text-white shadow-sm">
                  <ShoppingBag className="h-4.5 w-4.5 text-[#F5EFE6]" />
                </div>
                <span>{offerings}</span>
              </div>

              {/* Contact */}
              <div className="flex items-center gap-3.5 border-b border-dashed border-[#DFCEBD] pb-2.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#523321] text-white shadow-sm">
                  <Phone className="h-4.5 w-4.5 text-[#F5EFE6]" />
                </div>
                <span>{formatPhoneNumber(vendor.whatsapp_number)}</span>
              </div>

              {/* Verification */}
              <div className="flex items-center gap-3.5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#523321] text-white shadow-sm">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#F5EFE6]" />
                </div>
                <div className="flex items-center gap-2">
                  <span>{vendor.is_verified ? "Verified Vendor" : "Registered Vendor"}</span>
                  {vendor.is_verified && (
                    <div className="grid h-5 w-5 place-items-center rounded-full bg-[#C8A165] text-white shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 fill-current" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating "Visit My Store" Card (Bottom Right) - Solid crisp background and sharp borders with ZERO blur artifact on export */}
        <div className="absolute right-12 bottom-24 z-20 flex items-center gap-5 rounded-[28px] border-[2.5px] border-[#D4AF37]/80 bg-white p-4.5 shadow-xl max-w-[540px]">
          {/* QR Code */}
          <div className="rounded-2xl border border-[#E8D9C8] bg-white p-2.5 shadow-sm shrink-0">
            <QRCodeSVG
              value={storeUrl}
              size={120}
              bgColor="#FFFFFF"
              fgColor="#24150E"
              level="M"
            />
          </div>

          {/* Store Info & CTA */}
          <div className="flex flex-col justify-center min-w-0 pr-2">
            <div className="flex items-center gap-2 text-[15px] font-bold text-[#24150E]">
              <div className="grid h-5 w-5 place-items-center rounded-full bg-[#EFE7DC] text-[#7A4526]">
                <ShoppingBag className="h-3.5 w-3.5" />
              </div>
              <span className="whitespace-nowrap">Visit My Store</span>
            </div>

            {/* URL Pill Button with Accurate Domain */}
            <div className="mt-2.5 inline-flex items-center rounded-full bg-[#4A2C1D] px-4.5 py-1.5 text-[13px] font-semibold tracking-normal text-white shadow-sm self-start max-w-[340px] truncate whitespace-nowrap">
              <span>zango-connect.vercel.app/store/{vendor.slug}</span>
            </div>

            {/* Subtitle with curved arrow */}
            <div className="mt-2 flex items-center gap-2 text-[13px] leading-snug text-[#6E5A4E]">
              <span className="max-w-[210px]">
                Scan to explore my products and shop with confidence.
              </span>
              <svg
                viewBox="0 0 32 32"
                className="h-6 w-6 shrink-0 text-[#C5A059]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M26 6 C 24 18, 16 22, 7 22" />
                <polyline points="12 17 6 22 12 27" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Value Bar across full width */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex h-16 items-center justify-between bg-[#24150E] px-12 text-white shadow-2xl">
          <div className="flex items-center gap-8 text-[14px] font-medium tracking-wide whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-[#E2BA7A]" />
              <span>Shop Local</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#E2BA7A]" />
              <span>Trusted Seller</span>
            </div>
            <div className="h-4 w-px bg-white/20" />
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-[#E2BA7A]" />
              <span>Empowering Women</span>
            </div>
          </div>

          {/* Powered by ZANGO White Pill */}
          <div className="flex items-center gap-2.5 rounded-full bg-white px-4 py-1.5 text-[13px] font-bold text-[#24150E] shadow-md whitespace-nowrap">
            <span className="font-medium text-[#6E5A4E]">Powered by</span>
            <img
              src="/zango-logo.png"
              alt=""
              className="h-6 w-6 object-contain"
              crossOrigin="anonymous"
            />
            <span className="font-serif font-black tracking-wider text-[#24150E]">ZANGO</span>
          </div>
        </div>
      </div>
    );
  },
);

VendorCard.displayName = "VendorCard";
