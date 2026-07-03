import { supabase } from "@/integrations/supabase/client";

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

/**
 * Fetch featured products from CMS-managed table
 * Displays products in order set by admins
 */
export async function getFeaturedProducts(): Promise<HomepageFeaturedProduct[]> {
  try {
    const { data, error } = await supabase
      .from("featured_products_admin")
      .select(`
        id,
        product_id,
        display_order,
        products!inner(name, price, image_url, sellers!inner(business_name, slug))
      `)
      .order("display_order")
      .abortSignal(AbortSignal.timeout(5000));

    if (error) throw error;

    return (data || []).map((f: any) => ({
      id: f.id,
      product_id: f.product_id,
      name: f.products.name,
      price: f.products.price,
      image_url: f.products.image_url,
      seller_name: f.products.sellers.business_name,
      seller_slug: f.products.sellers.slug,
      display_order: f.display_order,
    }));
  } catch (err) {
    console.error("[homepage-cms] getFeaturedProducts failed:", err);
    return [];
  }
}

/**
 * Fetch trending sellers from CMS-managed table
 * Limited to first 3 for homepage display (max 12 stored, homepage shows first 3)
 */
export async function getTrendingSellers(limit: number = 3): Promise<HomepageTrendingSeller[]> {
  try {
    const { data, error } = await supabase
      .from("trending_sellers_admin")
      .select(`
        id,
        seller_id,
        display_order,
        sellers!inner(business_name, category, profile_photo_url, slug)
      `)
      .order("display_order")
      .limit(limit)
      .abortSignal(AbortSignal.timeout(5000));

    if (error) throw error;

    return (data || []).map((t: any) => ({
      id: t.id,
      seller_id: t.seller_id,
      business_name: t.sellers.business_name,
      category: t.sellers.category,
      profile_photo_url: t.sellers.profile_photo_url,
      slug: t.sellers.slug,
      display_order: t.display_order,
    }));
  } catch (err) {
    console.error("[homepage-cms] getTrendingSellers failed:", err);
    return [];
  }
}

/**
 * Architecture for future CMS sections:
 * - Add similar functions for hero banners, promotions, announcements, etc.
 * - Each section loads independently from its own admin-managed table
 * - Extensible structure allows homepage to become fully CMS-driven
 * - No hardcoded content beyond this point
 */
