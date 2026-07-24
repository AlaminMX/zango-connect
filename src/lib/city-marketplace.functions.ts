import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch a city's marketplace: sellers in that city (by city_id only)
 * and every active product from those sellers. Uses strict city_id
 * matching to avoid the free-text-mismatch bug that hid vendors.
 */
export async function getCityMarketplace({ data }: { data: { slug: string } }) {
  const { data: city, error: cityError } = await (supabase as any)
    .from("cities_of_business")
    .select("id, name, slug, state_id, is_active, states!inner(id, name, slug, is_active)")
    .eq("slug", data.slug)
    .maybeSingle();

  if (cityError || !city) return null;
  // Hide if either city or parent state is inactive (unless admin bypasses via RLS)
  if (!city.is_active || !city.states?.is_active) return null;

  const [{ data: sellers, error: sellersErr }, { data: products, error: productsErr }, { data: categories }] = await Promise.all([
    supabase.from("sellers")
      .select("id, business_name, slug, category, city, profile_photo_url, cover_photo_url, is_verified, rating, bio, whatsapp_number")
      .eq("city_id", city.id)
      .eq("status", "active")
      .eq("verification_status", "approved")
      .eq("is_blocked", false)
      .order("rating", { ascending: false }),
    supabase.from("products")
      .select("id, name, price, image_url, stock_status, status, seller_id, is_featured, featured_order, sellers!inner(id, business_name, slug, city_id, status, verification_status, is_blocked, whatsapp_number)")
      .eq("sellers.city_id", city.id)
      .eq("sellers.status", "active")
      .eq("sellers.verification_status", "approved")
      .eq("sellers.is_blocked", false)
      .eq("status", "active")
      .order("is_featured", { ascending: false })
      .order("featured_order")
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  if (sellersErr) throw new Error(sellersErr.message);
  if (productsErr) throw new Error(productsErr.message);

  return {
    city: {
      id: city.id, name: city.name, slug: city.slug,
      state: city.states?.name ?? "",
      state_slug: city.states?.slug ?? "",
    },
    sellers: sellers ?? [],
    products: products ?? [],
    categories: categories ?? [],
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
