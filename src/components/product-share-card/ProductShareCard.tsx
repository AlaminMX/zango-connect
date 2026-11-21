import { forwardRef } from "react";
import { MarketingCard, formatMarketingPrice } from "@/components/marketing-card/MarketingCard";
import { productUrl } from "@/lib/site";
import {
  PRODUCT_SHARE_CARD_WIDTH,
  PRODUCT_SHARE_CARD_HEIGHT,
} from "@/lib/product-share-card/export";
import type { ProductShareCardProps } from "@/lib/product-share-card/types";

export const ProductShareCard = forwardRef<HTMLDivElement, ProductShareCardProps>(
  ({ product, vendor, className }, ref) => (
    <MarketingCard
      ref={ref}
      width={PRODUCT_SHARE_CARD_WIDTH}
      height={PRODUCT_SHARE_CARD_HEIGHT}
      title={product.name}
      seller={vendor.business_name}
      location={vendor.city}
      image={product.image_url}
      accent="#94472f"
      url={productUrl(product.id)}
      price={formatMarketingPrice(product.price)}
      verified={vendor.is_verified === true}
      showQr
      className={className}
    />
  ),
);
ProductShareCard.displayName = "ProductShareCard";
