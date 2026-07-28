export interface ProductShareCardProduct {
  id: string;
  name: string;
  price?: number | string | null;
  image_url?: string | null;
}

export interface ProductShareCardVendor {
  business_name: string;
  slug: string;
  city?: string | null;
  is_verified?: boolean | null;
}

export interface ProductShareCardProps {
  product: ProductShareCardProduct;
  vendor: ProductShareCardVendor;
  className?: string;
}

export interface ProductShareCardExportOptions {
  node: HTMLElement;
  filename?: string;
  pixelRatio?: number;
}
