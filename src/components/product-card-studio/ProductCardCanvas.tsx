import { forwardRef, type CSSProperties } from "react";
import { MarketingCard, formatMarketingPrice } from "@/components/marketing-card/MarketingCard";
import {
  productCardFormats,
  resolveProductCardTheme,
  formatCardPhoneNumber,
  getProductStoreUrl,
} from "@/lib/product-card/themes";
import type {
  ProductCardCustomization,
  ProductMarketingCardProduct,
  ProductMarketingCardSeller,
} from "@/lib/product-card/types";

export interface ProductCardCanvasProps {
  product: ProductMarketingCardProduct;
  seller: ProductMarketingCardSeller;
  customization: ProductCardCustomization;
  className?: string;
  style?: CSSProperties;
}

export const ProductCardCanvas = forwardRef<HTMLDivElement, ProductCardCanvasProps>(
  ({ product, seller, customization, className, style }, ref) => {
    const { format, theme, variation, framingMode } = customization;
    const { width, height } = productCardFormats[format];
    const palette = resolveProductCardTheme(product.category || seller.category, theme);
    const stockLabels: Record<string, string> = {
      available: "In stock",
      low_stock: "Low stock",
      sold_out: "Sold out",
    };
    return (
      <MarketingCard
        ref={ref}
        width={width}
        height={height}
        title={product.name}
        seller={seller.business_name}
        location={seller.city || product.seller_city}
        image={product.image_url}
        accent={palette.accent}
        url={getProductStoreUrl(seller.slug || product.seller_slug, product.id)}
        price={formatMarketingPrice(product.price)}
        note={customization.customTagline}
        stock={customization.showStockBadge ? stockLabels[product.stock_status ?? ""] : undefined}
        contact={
          customization.showWhatsAppBadge
            ? formatCardPhoneNumber(product.whatsapp_number || seller.whatsapp_number)
            : undefined
        }
        verified={
          customization.showVerifiedBadge &&
          (seller.is_verified ?? product.seller_is_verified) === true
        }
        showQr={customization.showQRCode}
        fullBleed={framingMode === "full-bleed"}
        landscapeReverse={variation % 3 === 1}
        stackedReverse={variation % 3 === 2}
        className={className}
        style={style}
      />
    );
  },
);
ProductCardCanvas.displayName = "ProductCardCanvas";
