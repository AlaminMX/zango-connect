/**
 * homepage-cms.ts — CMS helpers for admin-managed trending sellers, backed
 * by the trending_sellers_admin table.
 *
 * (Featured products are controlled directly on products.is_featured /
 * products.featured_order via the admin Products tab, not through a CMS
 * table — see src/routes/admin.tsx.)
 */
import { supabase } from "@/integrations/supabase/client";

export interface HomepageTrendingSeller {
  id: string;
  seller_id: string;
  business_name: string;
  category: string;
  profile_photo_url: string | null;
  slug: string;
  display_order: number;
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
