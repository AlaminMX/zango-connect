/**
 * States server functions — public listing + admin management.
 * Counts come from `states_with_stats` / `cities_with_stats` views
 * (joins on seller.state_id / city_id) so nothing is cached.
 */
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
    admin_id: adminId, action, target_type: "state", target_id: targetId, metadata: metadata as never,
  });
}

export interface StateStatRow {
  id: string; name: string; slug: string; is_active: boolean; is_featured_home: boolean; sort_order: number;
  cities_count: number; sellers_count: number; products_count: number;
}

export interface CityStatRow {
  id: string; name: string; slug: string; state_id: string; state_name: string; state_slug: string;
  is_active: boolean; is_featured_home: boolean; sort_order: number;
  state_is_active: boolean; sellers_count: number; products_count: number;
}

// ─────────────── Public ───────────────

export const listActiveStates = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await (supabaseAdmin as any)
    .from("states_with_stats")
    .select("*")
    .eq("is_active", true)
    .order("is_featured_home", { ascending: false })
    .order("sellers_count", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as StateStatRow[];
});

export const listCitiesForState = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { data: state, error: stErr } = await (supabaseAdmin as any)
      .from("states").select("id, name, slug, is_active").eq("slug", data.slug).maybeSingle();
    if (stErr) throw new Error(stErr.message);
    if (!state || !state.is_active) return null;
    const { data: cities, error } = await (supabaseAdmin as any)
      .from("cities_with_stats")
      .select("*")
      .eq("state_id", state.id)
      .eq("is_active", true)
      .order("sellers_count", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return { state, cities: (cities ?? []) as CityStatRow[] };
  });

// ─────────────── Admin ───────────────

export const adminListStatesWithStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await (supabaseAdmin as any)
      .from("states_with_stats").select("*")
      .order("is_active", { ascending: false })
      .order("sellers_count", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as StateStatRow[];
  });

export const adminListCitiesForStateWithStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ stateId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("cities_with_stats").select("*")
      .eq("state_id", data.stateId)
      .order("is_active", { ascending: false })
      .order("sellers_count", { ascending: false })
      .order("name");
    if (error) throw new Error(error.message);
    return (rows ?? []) as CityStatRow[];
  });

const toggleSchema = z.object({ id: z.string().uuid(), value: z.boolean() });

export const adminSetStateActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await (supabaseAdmin as any).from("states")
      .update({ is_active: data.value }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "state.set_active", data.id, { value: data.value });
    return { ok: true };
  });

export const adminSetStateFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.value) {
      const { count } = await (supabaseAdmin as any).from("states")
        .select("id", { count: "exact", head: true })
        .eq("is_featured_home", true).neq("id", data.id);
      if ((count ?? 0) >= 5) throw new Error("Max 5 featured states on the homepage. Unfeature another first.");
    }
    const { error } = await (supabaseAdmin as any).from("states")
      .update({ is_featured_home: data.value }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "state.set_featured", data.id, { value: data.value });
    return { ok: true };
  });

export const adminSetCityActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => toggleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await (supabaseAdmin as any).from("cities_of_business")
      .update({ is_active: data.value }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.userId, "city.set_active", data.id, { value: data.value });
    return { ok: true };
  });
