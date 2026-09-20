import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

async function audit(
  supabase: any,
  adminId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await supabase.from("admin_audit_log").insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      metadata: metadata as never,
    });
  } catch (err) {
    console.warn("[admin audit] failed to log:", err);
  }
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
    const { error } = await context.supabase
      .from("sellers")
      .update(updates as never)
      .eq("id", data.sellerId);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, `seller.${data.status}`, "seller", data.sellerId, {
      reason: data.reason,
    });
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
    const { error } = await context.supabase
      .from("sellers")
      .update({ subscription_expires_at: data.expiresAt })
      .eq("id", data.sellerId);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "subscription.change", "seller", data.sellerId, {
      expiresAt: data.expiresAt,
    });
    return { ok: true };
  });

const deleteSellerSchema = z.object({ sellerId: z.string().uuid() });

export const deleteSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteSellerSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = context.supabase;

    // Capture user_id and business_name BEFORE deleting so we can clean up the auth account.
    const { data: sellerRow, error: findErr } = await db
      .from("sellers")
      .select("user_id, business_name")
      .eq("id", data.sellerId)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);

    const targetUserId = sellerRow?.user_id;

    // 1. Delete associated child records safely
    await db.from("products").delete().eq("seller_id", data.sellerId);
    await db.from("seller_notices").delete().eq("seller_id", data.sellerId);
    await db.from("seller_warnings").delete().eq("seller_id", data.sellerId);
    await db.from("page_views").delete().eq("seller_id", data.sellerId);
    await db
      .from("vouches")
      .delete()
      .or(`vouched_seller_id.eq.${data.sellerId},voucher_seller_id.eq.${data.sellerId}`);
    await db.from("whatsapp_clicks").delete().eq("seller_id", data.sellerId);

    // 2. Delete the seller record
    const { error } = await db.from("sellers").delete().eq("id", data.sellerId);
    if (error) throw new Error(error.message);

    // 3. If target user exists, clean up user roles and auth
    if (targetUserId) {
      await db.from("user_roles").delete().eq("user_id", targetUserId);

      // Attempt hard-delete of the auth user via RPC if available
      try {
        const { error: rpcErr } = await db.rpc("admin_delete_user", {
          target_user_id: targetUserId,
        });
        if (rpcErr) {
          console.warn("[admin] admin_delete_user RPC warning:", rpcErr.message);
        }
      } catch (err: any) {
        console.warn("[admin] admin_delete_user call failed:", err?.message);
      }

      // If service role key is configured, also call Supabase Auth Admin API
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
          if (authErr) console.warn("[admin] auth user delete failed:", authErr.message);
        } catch (err: any) {
          console.warn("[admin] auth admin deleteUser error:", err?.message);
        }
      }
    }

    await audit(db, context.userId, "seller.delete", "seller", data.sellerId, {
      business_name: sellerRow?.business_name,
      deleted_user_id: targetUserId,
    });
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
    const { error } = await context.supabase
      .from("products")
      .update(updates as never)
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, `product.${data.status}`, "product", data.productId, {
      reason: data.reason,
    });
    return { ok: true };
  });

const deleteProductSchema = z.object({ productId: z.string().uuid() });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteProductSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("products").delete().eq("id", data.productId);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "product.delete", "product", data.productId);
    return { ok: true };
  });

const vendorAuthInfoSchema = z.object({ sellerId: z.string().uuid() });

export const getVendorAuthInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => vendorAuthInfoSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: seller, error: sellerError } = await context.supabase
      .from("sellers")
      .select("user_id")
      .eq("id", data.sellerId)
      .maybeSingle();
    if (sellerError) throw new Error(sellerError.message);
    if (!seller) throw new Error("Seller not found");

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { email: null, lastSignInAt: null };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(
        seller.user_id,
      );
      if (authError) throw new Error(authError.message);

      return {
        email: authUser.user?.email ?? null,
        lastSignInAt: authUser.user?.last_sign_in_at ?? null,
      };
    } catch (err) {
      return { email: null, lastSignInAt: null };
    }
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
    const { data: row, error } = await context.supabase
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
    await audit(context.supabase, context.userId, "notice.send", "notice", row.id, { severity: data.severity });
    return { ok: true, id: row.id };
  });
