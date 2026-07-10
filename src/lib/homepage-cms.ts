/**
 * homepage-cms.ts — stub. Legacy CMS tables (featured_products_admin,
 * trending_sellers_admin) have been removed from the schema. These helpers
 * now return empty arrays so downstream callers keep compiling; homepage
 * content is served from `homepage_sections` + live queries directly.
 */

export interface HomepageFeaturedProduct {
  id: string;
  product_id: string;
  name: string;
  price: number | null;
  image_url: string | null;
  seller_name: string;
  seller_slug: string;
  display_order: number;
}

export interface HomepageTrendingSeller {
  id: string;
  seller_id: string;
  business_name: string;
  category: string;
  profile_photo_url: string | null;
  slug: string;
  display_order: number;
}

export async function getFeaturedProducts(): Promise<HomepageFeaturedProduct[]> {
  return [];
}

export async function getTrendingSellers(_limit: number = 3): Promise<HomepageTrendingSeller[]> {
  return [];
}
