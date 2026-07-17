/**
 * homepage-cms.ts — CMS helpers for admin-managed featured products and
 * trending sellers, backed by the featured_products_admin and
 * trending_sellers_admin tables.
 */
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

export async function getFeaturedProducts(): Promise<HomepageFeaturedProduct[]> {
  const { data, error } = await supabase
    .from("featured_products_admin")
    .select(`
      id,
      product_id,
      display_order,
      products:product_id (
        name,
        price,
        image_url,
        status,
        sellers:seller_id (
          business_name,
          slug,
          verification_status,
          is_blocked
        )
      )
    `)
    .order("display_order");

  if (error || !data) return [];

  return data
    .filter((row: any) => {
      const p = row.products;
      if (!p) return false;
      if (p.status !== "active") return false;
      const s = p.sellers;
      if (!s) return false;
      if (s.is_blocked || s.verification_status !== "approved") return false;
      return true;
    })
    .map((row: any) => ({
      id: row.id,
      product_id: row.product_id,
      display_order: row.display_order,
      name: row.products.name,
      price: row.products.price,
      image_url: row.products.image_url,
      seller_name: row.products.sellers.business_name,
      seller_slug: row.products.sellers.slug,
    }));
}

export async function getTrendingSellers(limit: number = 3): Promise<HomepageTrendingSeller[]> {
  const { data, error } = await supabase
    .from("trending_sellers_admin")
    .select(`
      id,
      seller_id,
      display_order,
      sellers:seller_id (
        business_name,
        category,
        profile_photo_url,
        slug,
        status,
        verification_status,
        is_blocked
      )
    `)
    .order("display_order")
    .limit(limit);

  if (error || !data) return [];

  return data
    .filter((row: any) => {
      const s = row.sellers;
      if (!s) return false;
      if (s.is_blocked || s.verification_status !== "approved" || s.status !== "active") return false;
      return true;
    })
    .map((row: any) => ({
      id: row.id,
      seller_id: row.seller_id,
      display_order: row.display_order,
      business_name: row.sellers.business_name,
      category: row.sellers.category,
      profile_photo_url: row.sellers.profile_photo_url,
      slug: row.sellers.slug,
    }));
}
