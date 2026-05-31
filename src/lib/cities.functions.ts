import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

async function audit(adminId: string, action: string, targetId: string | null, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId, action, target_type: "city", target_id: targetId, metadata: metadata as never,
  });
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

// Public: list active cities (no auth)
export const listActiveCities = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("cities_of_business")
    .select("id, name, state, slug, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

// Public: get city by slug
export const getCityBySlug = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { data: city, error } = await supabaseAdmin
      .from("cities_of_business").select("*").eq("slug", data.slug).eq("is_active", true).maybeSingle();
    if (error) throw new Error(error.message);
    return city;
  });

// Public: city marketplace data (sellers + featured products + categories)
export const getCityMarketplace = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { data: city } = await supabaseAdmin
      .from("cities_of_business").select("*").eq("slug", data.slug).eq("is_active", true).maybeSingle();
    if (!city) return null;

    const [{ data: sellers }, { data: products }, { data: categories }] = await Promise.all([
      supabaseAdmin.from("sellers")
        .select("id, business_name, slug, category, city, profile_photo_url, cover_photo_url, is_verified, rating, bio")
        .eq("city_id", city.id).eq("status", "active").eq("verification_status", "approved")
        .order("rating", { ascending: false }).limit(60),
      supabaseAdmin.from("products")
        .select("id, name, price, image_url, stock_status, is_featured, featured_order, sellers!inner(id, business_name, slug, city_id, status, verification_status)")
        .eq("sellers.city_id", city.id).eq("sellers.status", "active").eq("sellers.verification_status", "approved")
        .eq("status", "active").order("is_featured", { ascending: false }).order("featured_order").limit(60),
      supabaseAdmin.from("categories").select("*").order("sort_order"),
    ]);
    return { city, sellers: sellers ?? [], products: products ?? [], categories: categories ?? [] };
  });

// Admin: list cities with stats
export const adminListCitiesWithStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await (supabaseAdmin as any)
      .from("cities_with_stats")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Array<{
      id: string; name: string; state: string; slug: string; is_active: boolean; sort_order: number;
      sellers_count: number; sellers_added_30d: number; products_count: number; products_added_30d: number;
    }>;
  });


const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

export const adminUpsertCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.id) {
      const { error } = await supabaseAdmin.from("cities_of_business")
        .update({ name: data.name, state: data.state, is_active: data.is_active, sort_order: data.sort_order } as never)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await audit(context.userId, "city.update", data.id, { name: data.name });
      return { ok: true, id: data.id };
    }
    const slug = slugify(data.name);
    const { data: row, error } = await supabaseAdmin.from("cities_of_business")
      .insert({ name: data.name, state: data.state, slug, is_active: data.is_active, sort_order: data.sort_order })
      .select().single();
    if (error) throw new Error(error.message);
    await audit(context.userId, "city.create", row.id, { name: data.name });
    return { ok: true, id: row.id };
  });

export const adminDeleteCity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { count } = await supabaseAdmin.from("sellers").select("id", { count: "exact", head: true }).eq("city_id", data.id);
    if ((count ?? 0) > 0) throw new Error(`Cannot delete — ${count} sellers reference this city. Disable it instead.`);
    const { error } = await supabaseAdmin.from("cities_of_business").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "city.delete", data.id);
    return { ok: true };
  });
