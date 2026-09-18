import { supabase } from "@/integrations/supabase/client";

export interface StateStatRow {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_featured_home?: boolean;
  sort_order?: number;
  cities_count?: number;
  sellers_count?: number;
  products_count?: number;
}

export interface CityStatRow {
  id: string;
  name: string;
  slug: string;
  state: string;
  state_id?: string;
  state_name?: string;
  state_slug?: string;
  is_active: boolean;
  sellers_count: number;
  products_count: number;
}

/**
 * Returns all active states with live computed counts, ensuring Zaria is separated
 * from Kaduna as a standalone state with its own vendors and products.
 */
export async function getNormalizedStatesWithStats(): Promise<StateStatRow[]> {
  const [
    { data: statesData },
    { data: sellersData },
    { data: productsData },
  ] = await Promise.all([
    (supabase as any)
      .from("states_with_stats")
      .select("id, name, slug, is_active, is_featured_home, sort_order, cities_count, sellers_count, products_count")
      .eq("is_active", true),
    supabase
      .from("sellers")
      .select("id, city, state, status, verification_status, is_blocked")
      .eq("status", "active")
      .eq("verification_status", "approved")
      .eq("is_blocked", false),
    supabase
      .from("products")
      .select("id, status, seller_id, sellers!inner(id, city, state, status, verification_status, is_blocked)")
      .eq("status", "active")
      .eq("sellers.status", "active")
      .eq("sellers.verification_status", "approved")
      .eq("sellers.is_blocked", false),
  ]);

  const activeSellers = sellersData ?? [];
  const activeProducts = productsData ?? [];

  // Count Zaria vs Kaduna live
  const zariaSellers = activeSellers.filter(
    (s: any) => s.city?.toLowerCase() === "zaria" || s.state?.toLowerCase() === "zaria",
  );
  const kadunaSellers = activeSellers.filter(
    (s: any) =>
      (s.city?.toLowerCase() === "kaduna" || s.state?.toLowerCase() === "kaduna") &&
      s.city?.toLowerCase() !== "zaria",
  );

  const zariaSellerIds = new Set(zariaSellers.map((s: any) => s.id));
  const kadunaSellerIds = new Set(kadunaSellers.map((s: any) => s.id));

  const zariaProductsCount = activeProducts.filter((p: any) => zariaSellerIds.has(p.seller_id)).length;
  const kadunaProductsCount = activeProducts.filter((p: any) => kadunaSellerIds.has(p.seller_id)).length;

  const rawStates: StateStatRow[] = (statesData ?? []).map((st: any) => {
    if (st.slug === "kaduna" || st.name.toLowerCase() === "kaduna") {
      return {
        ...st,
        name: "Kaduna",
        slug: "kaduna",
        cities_count: 1,
        sellers_count: kadunaSellers.length,
        products_count: kadunaProductsCount,
      };
    }
    return st;
  });

  // Ensure Zaria is present as its own standalone state
  const hasZaria = rawStates.some((s) => s.slug === "zaria" || s.name.toLowerCase() === "zaria");
  if (!hasZaria) {
    rawStates.push({
      id: "zaria-state",
      name: "Zaria",
      slug: "zaria",
      is_active: true,
      is_featured_home: true,
      sort_order: 3,
      cities_count: 1,
      sellers_count: zariaSellers.length,
      products_count: zariaProductsCount,
    });
  } else {
    // If Zaria exists in list, ensure counts are accurate
    const idx = rawStates.findIndex((s) => s.slug === "zaria" || s.name.toLowerCase() === "zaria");
    rawStates[idx] = {
      ...rawStates[idx],
      name: "Zaria",
      slug: "zaria",
      is_active: true,
      is_featured_home: true,
      cities_count: 1,
      sellers_count: zariaSellers.length,
      products_count: zariaProductsCount,
    };
  }

  // Sort states: featured first, then highest sellers_count, then alphabetical
  rawStates.sort((a, b) => {
    const af = a.is_featured_home ? 1 : 0;
    const bf = b.is_featured_home ? 1 : 0;
    if (af !== bf) return bf - af;
    const ac = a.sellers_count ?? 0;
    const bc = b.sellers_count ?? 0;
    if (ac !== bc) return bc - ac;
    return a.name.localeCompare(b.name);
  });

  return rawStates;
}

/**
 * Loads state details and cities for a specific state slug.
 * Correctly isolates Zaria and Kaduna.
 */
export async function getNormalizedStateWithCities(slug: string) {
  const normSlug = slug.toLowerCase().trim();

  if (normSlug === "zaria") {
    const [
      { data: zariaSellers },
      { data: zariaProducts },
    ] = await Promise.all([
      supabase
        .from("sellers")
        .select("id, city, state, status, verification_status, is_blocked")
        .eq("status", "active")
        .eq("verification_status", "approved")
        .eq("is_blocked", false)
        .or("city.ilike.%zaria%,state.ilike.%zaria%"),
      supabase
        .from("products")
        .select("id, status, seller_id, sellers!inner(id, city, state, status, verification_status, is_blocked)")
        .eq("status", "active")
        .eq("sellers.status", "active")
        .eq("sellers.verification_status", "approved")
        .eq("sellers.is_blocked", false)
        .or("sellers.city.ilike.%zaria%,sellers.state.ilike.%zaria%"),
    ]);

    const sellersCount = zariaSellers?.length ?? 0;
    const productsCount = zariaProducts?.length ?? 0;

    return {
      state: {
        id: "zaria-state",
        name: "Zaria",
        slug: "zaria",
        sellers_count: sellersCount,
        products_count: productsCount,
        cities_count: 1,
      },
      cities: [
        {
          id: "a0bf4122-d67f-4681-b22c-3897b01aefab",
          name: "Zaria",
          slug: "zaria-kaduna",
          state: "Zaria",
          is_active: true,
          sellers_count: sellersCount,
          products_count: productsCount,
        },
      ],
    };
  }

  if (normSlug === "kaduna") {
    const [
      { data: kadunaSellers },
      { data: kadunaProducts },
    ] = await Promise.all([
      supabase
        .from("sellers")
        .select("id, city, state, status, verification_status, is_blocked")
        .eq("status", "active")
        .eq("verification_status", "approved")
        .eq("is_blocked", false)
        .ilike("city", "%kaduna%"),
      supabase
        .from("products")
        .select("id, status, seller_id, sellers!inner(id, city, state, status, verification_status, is_blocked)")
        .eq("status", "active")
        .eq("sellers.status", "active")
        .eq("sellers.verification_status", "approved")
        .eq("sellers.is_blocked", false)
        .ilike("sellers.city", "%kaduna%"),
    ]);

    const cleanSellers = (kadunaSellers ?? []).filter((s: any) => s.city?.toLowerCase() !== "zaria");
    const cleanProducts = (kadunaProducts ?? []).filter((p: any) => p.sellers?.city?.toLowerCase() !== "zaria");

    return {
      state: {
        id: "5f2c59fd-4758-4a11-817a-668d38f9f8fc",
        name: "Kaduna",
        slug: "kaduna",
        sellers_count: cleanSellers.length,
        products_count: cleanProducts.length,
        cities_count: 1,
      },
      cities: [
        {
          id: "5bbb56ee-b36b-4129-a3ad-37a467cc39da",
          name: "Kaduna",
          slug: "kaduna-city",
          state: "Kaduna",
          is_active: true,
          sellers_count: cleanSellers.length,
          products_count: cleanProducts.length,
        },
      ],
    };
  }

  // General state handling
  const { data: st, error: stErr } = await (supabase as any)
    .from("states_with_stats")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (stErr) throw stErr;
  if (!st) return null;

  const { data: cities, error: cErr } = await (supabase as any)
    .from("cities_with_stats")
    .select("id, name, slug, is_active, sellers_count, products_count")
    .eq("state_id", st.id)
    .eq("is_active", true)
    .order("sellers_count", { ascending: false })
    .order("name");
  if (cErr) throw cErr;

  return { state: st, cities: (cities ?? []) as CityStatRow[] };
}

/**
 * Returns all active cities with Zaria mapped to "Zaria" state.
 */
export async function getNormalizedCitiesWithStats(): Promise<CityStatRow[]> {
  const { data: rawCities, error } = await (supabase as any)
    .from("cities_with_stats")
    .select("id, name, state, slug, is_active, sellers_count, products_count")
    .eq("is_active", true);

  if (error || !rawCities) {
    const { data: fb } = await supabase
      .from("cities_of_business")
      .select("id, name, state, slug")
      .eq("is_active", true);
    return ((fb ?? []) as any[]).map((c) => ({
      ...c,
      state: c.name.toLowerCase() === "zaria" ? "Zaria" : c.state,
      sellers_count: 0,
      products_count: 0,
    }));
  }

  return rawCities.map((c: any) => ({
    ...c,
    state: c.name.toLowerCase() === "zaria" ? "Zaria" : c.state,
  }));
}
