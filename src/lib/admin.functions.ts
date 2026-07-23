import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

async function audit(adminId: string, action: string, targetType: string, targetId: string | null, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata as never,
  });
}

const sellerStatusSchema = z.object({
  sellerId: z.string().uuid(),
  status: z.enum(["active", "suspended", "expired", "blocked"]),
  reason: z.string().max(500).optional(),
});

export const setSellerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sellerStatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const updates: Record<string, unknown> = { status: data.status };
    if (data.status === "blocked") {
      updates.blocked_at = new Date().toISOString();
      updates.blocked_reason = data.reason ?? null;
    } else {
      updates.blocked_at = null;
      updates.blocked_reason = null;
    }
    const { error } = await supabaseAdmin.from("sellers").update(updates as never).eq("id", data.sellerId);
    if (error) throw new Error(error.message);
    await audit(context.userId, `seller.${data.status}`, "seller", data.sellerId, { reason: data.reason });
    return { ok: true };
  });

const setExpirySchema = z.object({
  sellerId: z.string().uuid(),
  expiresAt: z.string().datetime().nullable(),
});

export const setSubscriptionExpiry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setExpirySchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("sellers")
      .update({ subscription_expires_at: data.expiresAt })
      .eq("id", data.sellerId);
    if (error) throw new Error(error.message);
    await audit(context.userId, "subscription.change", "seller", data.sellerId, { expiresAt: data.expiresAt });
    return { ok: true };
  });

const deleteSellerSchema = z.object({ sellerId: z.string().uuid() });

export const deleteSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteSellerSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Capture user_id BEFORE deleting so we can hard-delete the auth account.
    const { data: sellerRow } = await supabaseAdmin
      .from("sellers").select("user_id").eq("id", data.sellerId).maybeSingle();
    await supabaseAdmin.from("products").delete().eq("seller_id", data.sellerId);
    await supabaseAdmin.from("seller_notices").delete().eq("seller_id", data.sellerId);
    await supabaseAdmin.from("vouches").delete().or(`vouched_seller_id.eq.${data.sellerId},voucher_seller_id.eq.${data.sellerId}`);
    await supabaseAdmin.from("whatsapp_clicks").delete().eq("seller_id", data.sellerId);
    const { error } = await supabaseAdmin.from("sellers").delete().eq("id", data.sellerId);
    if (error) throw new Error(error.message);
    if (sellerRow?.user_id) {
      const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(sellerRow.user_id);
      if (authErr) console.warn("[admin] auth user delete failed:", authErr.message);
    }
    await audit(context.userId, "seller.delete", "seller", data.sellerId);
    return { ok: true };
  });

const productStatusSchema = z.object({
  productId: z.string().uuid(),
  status: z.enum(["active", "blocked"]),
  reason: z.string().max(500).optional(),
});

export const setProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productStatusSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const updates: Record<string, unknown> = { status: data.status };
    if (data.status === "blocked") {
      updates.blocked_at = new Date().toISOString();
      updates.blocked_reason = data.reason ?? null;
    } else {
      updates.blocked_at = null;
      updates.blocked_reason = null;
    }
    const { error } = await supabaseAdmin.from("products").update(updates as never).eq("id", data.productId);
    if (error) throw new Error(error.message);
    await audit(context.userId, `product.${data.status}`, "product", data.productId, { reason: data.reason });
    return { ok: true };
  });

const deleteProductSchema = z.object({ productId: z.string().uuid() });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.productId);
    if (error) throw new Error(error.message);
    await audit(context.userId, "product.delete", "product", data.productId);
    return { ok: true };
  });

const vendorAuthInfoSchema = z.object({ sellerId: z.string().uuid() });

// Email and last-login live in auth.users, which is never reachable via
// PostgREST/RLS regardless of role — Supabase blocks it at the schema
// level. This is the one piece of the Vendor Details page that genuinely
// needs the service-role client; everything else on that page (warnings,
// notes, page_views, seller/product rows) goes through normal RLS-gated
// reads because the admin's own session already satisfies has_role(admin).
export const getVendorAuthInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vendorAuthInfoSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: seller, error: sellerError } = await supabaseAdmin
      .from("sellers")
      .select("user_id")
      .eq("id", data.sellerId)
      .maybeSingle();
    if (sellerError) throw new Error(sellerError.message);
    if (!seller) throw new Error("Seller not found");

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(seller.user_id);
    if (authError) throw new Error(authError.message);

    return {
      email: authUser.user?.email ?? null,
      lastSignInAt: authUser.user?.last_sign_in_at ?? null,
    };
  });

const noticeSchema = z.object({
  sellerId: z.string().uuid(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  severity: z.enum(["info", "warning", "critical"]),
});

export const sendNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => noticeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("seller_notices")
      .insert({
        seller_id: data.sellerId,
        created_by: context.userId,
        title: data.title,
        message: data.message,
        severity: data.severity,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await audit(context.userId, "notice.send", "notice", row.id, { severity: data.severity });
    return { ok: true, id: row.id };
  });
