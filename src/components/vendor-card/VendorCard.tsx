import { forwardRef } from "react";
import { BrandMark } from "./BrandMark";
import { VendorLogo } from "./VendorLogo";
import { CategoryPill } from "./CategoryPill";
import { VendorInfoList } from "./VendorInfoList";
import { CoverPanel } from "./CoverPanel";
import { QRFloatingCard } from "./QRFloatingCard";
import { BottomBar } from "./BottomBar";
import { buildStoreUrl, type VendorCardProps } from "./types";

/**
 * The card is always rendered at its native 1600×900 design size — never
 * resized via CSS % widths — so the DOM that `html-to-image` captures is
 * identical to what gets exported. Responsive on-screen scaling is handled
 * by the parent (`VendorCardExport`), which wraps this in a CSS transform.
 */
export const VendorCard = forwardRef<HTMLDivElement, VendorCardProps>(function VendorCard(
  {
    businessName,
    description,
    logo,
    coverImage,
    category,
    location,
    verified,
    productCount,
    joinDate,
    slug,
    className,
  },
  ref,
) {
  const storeUrl = buildStoreUrl(slug);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`${businessName} — Zango vendor share card`}
      className={`relative flex h-[900px] w-[1600px] shrink-0 flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(150deg,#F8F4EF_0%,#F3E9DC_55%,#EFE0C9_100%)] shadow-[0_40px_80px_-24px_rgba(91,58,41,0.35)] ${className ?? ""}`}
    >
      {/* Decorative watermark ring, purely ornamental */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D9C2A3]/25" />

      <div className="relative flex flex-1 flex-col overflow-hidden px-16 pb-10 pt-11">
        <BrandMark />

        <div className="mt-9 flex flex-1 items-center gap-14">
          {/* LEFT — identity + info */}
          <div className="flex flex-[1.15] flex-col justify-center">
            <VendorLogo logo={logo} businessName={businessName} />

            <div className="mt-5">
              <CategoryPill category={category} />
            </div>

            <h1 className="mt-4 line-clamp-2 max-w-[620px] font-display text-[54px] font-bold leading-[1.06] text-[#4A2E1F]">
              {businessName}
            </h1>

            {description && (
              <p className="mt-3 line-clamp-2 max-w-[560px] text-[17px] leading-[1.5] text-[#6B4E3A]">
                {description}
              </p>
            )}

            <div className="mt-7">
              <VendorInfoList
                location={location}
                category={category}
                verified={verified}
                productCount={productCount}
                joinDate={joinDate}
              />
            </div>
          </div>

          {/* RIGHT — cover image (~45% width) + floating QR */}
          <div className="relative flex flex-[1] items-stretch self-stretch py-2">
            <CoverPanel coverImage={coverImage} businessName={businessName} />
            <QRFloatingCard storeUrl={storeUrl} />
          </div>
        </div>
      </div>

      <BottomBar />
    </div>
  );
});
