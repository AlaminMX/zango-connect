import { forwardRef } from "react";
import { MarketingCard, cardInitials } from "@/components/marketing-card/MarketingCard";
import { cn } from "@/lib/utils";
import { formatCardPhoneNumber } from "@/lib/product-card/themes";
import {
  getVendorStoreUrl,
  resolveVendorCardTheme,
  vendorCardFormats,
} from "@/lib/vendor-card/themes";
import type { VendorCardProps } from "@/lib/vendor-card/types";

export const VendorCard = forwardRef<HTMLDivElement, VendorCardProps>(
  (
    {
      vendor,
      products = [],
      theme,
      format = "landscape",
      className,
      selectedImageUrl,
      selectedProductIndex,
    },
    ref,
  ) => {
    const { width, height } = vendorCardFormats[format];
    const palette = resolveVendorCardTheme(vendor.category, theme);
    const productPhotos = products.flatMap((product) => {
      const gallery = product.image_urls?.filter(Boolean);
      return (gallery?.length ? gallery : [product.image_url]).filter(Boolean);
    });
    const image =
      selectedImageUrl ||
      productPhotos[selectedProductIndex ?? 0] ||
      vendor.cover_photo_url ||
      vendor.profile_photo_url;

    if (format === "profile-picture") {
      return (
        <div
          ref={ref}
          className={cn(
            "flex flex-col items-center justify-center gap-8 overflow-hidden text-center",
            className,
          )}
          style={{ width, height, background: "#f8f2e8", color: "#231d19" }}
        >
          <div
            className="grid h-[410px] w-[410px] place-items-center overflow-hidden rounded-full font-serif text-[136px] text-white"
            style={{ background: palette.accent }}
          >
            {vendor.profile_photo_url ? (
              <img
                src={vendor.profile_photo_url}
                alt=""
                crossOrigin="anonymous"
                className="h-full w-full object-cover"
              />
            ) : (
              cardInitials(vendor.business_name)
            )}
          </div>
          <p className="line-clamp-2 max-w-[670px] break-words font-serif text-[68px] font-bold leading-none tracking-tight">
            {vendor.business_name}
          </p>
          <p className="text-[32px] font-black tracking-[0.14em]">ZANGO</p>
        </div>
      );
    }

    return (
      <MarketingCard
        ref={ref}
        width={width}
        height={height}
        title={vendor.business_name}
        location={vendor.city}
        image={image}
        accent={palette.accent}
        url={getVendorStoreUrl(vendor.slug)}
        note={vendor.bio?.trim() || vendor.category || undefined}
        contact={formatCardPhoneNumber(vendor.whatsapp_number)}
        verified={vendor.is_verified === true}
        showQr
        className={className}
      />
    );
  },
);
VendorCard.displayName = "VendorCard";
