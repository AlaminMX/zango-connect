import { supabase } from "@/integrations/supabase/client";

export async function getCityMarketplace({ data }: { data: { slug: string } }) {
  const { data: city, error: cityError } = await supabase
    .from("cities_of_business")
    .select("*")
    .eq("slug", data.slug)
    .single();

  if (cityError || !city) return null;

  // Match sellers by city_id (preferred) OR by city name text (fallback for
  // sellers onboarded before city_id was backfilled)
  const { data: sellers } = await supabase
    .from("sellers")
    .select("id, business_name, slug, category, profile_photo_url, is_verified, rating, is_blocked, city, city_id, products!inner(id, name, price, image_url, stock_status, status)")
    .or(`city_id.eq.${city.id},city.ilike.${city.name}`)
    .eq("status", "active")
    .eq("verification_status", "approved")
    .eq("is_blocked", false)
    .eq("products.status", "active");

  const { data: categories } = await supabase
    .from("categories")
    .select("*");

  const products = (sellers || []).flatMap((s) => 
    (s.products || []).map((p: any) => ({ ...p, sellers: { id: s.id, business_name: s.business_name, slug: s.slug } }))
  );

  return {
    city,
    sellers: sellers || [],
    products,
    categories: categories || []
  };
}

export async function listActiveCities() {
  const { data } = await supabase
    .from("cities_of_business")
    .select("*")
    .eq("is_active", true)
    .order("name");
  return data || [];
}

export async function getCityBySlug(slug: string) {
  const { data } = await supabase
    .from("cities_of_business")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
}
