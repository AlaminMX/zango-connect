import { supabase } from "@/integrations/supabase/client";

export async function getCityMarketplace({ data }: { data: { slug: string } }) {
  const { data: city, error: cityError } = await supabase
    .from("cities_of_business")
    .select("*")
    .eq("slug", data.slug)
    .single();

  if (cityError || !city) return null;

  const { data: sellers } = await supabase
    .from("sellers")
    .select("*, products(*)")
    .eq("city_id", city.id)
    .eq("status", "active")
    .eq("verification_status", "approved");

  const { data: categories } = await supabase
    .from("categories")
    .select("*");

  const products = (sellers || []).flatMap((s) => 
    (s.products || []).map((p) => ({ ...p, sellers: { id: s.id, business_name: s.business_name, slug: s.slug } }))
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
