import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

async function audit(adminId: string, action: string, targetId: string, metadata: Record<string, unknown> = {}) {
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: adminId, action, target_type: "seller", target_id: targetId, metadata: metadata as never,
  });
}

async function postNotice(sellerId: string, adminId: string, title: string, message: string, severity: "info" | "warning" | "critical") {
  await supabaseAdmin.from("seller_notices").insert({
    seller_id: sellerId, created_by: adminId, title, message, severity,
  });
}

const decisionSchema = z.object({
  sellerId: z.string().uuid(),
  status: z.enum(["approved", "rejected", "suspended", "pending"]),
  reason: z.string().max(1000).optional(),
});

export const setVerificationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => decisionSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const updates: Record<string, unknown> = {
      verification_status: data.status,
      verification_decided_at: new Date().toISOString(),
      verification_decided_by: context.userId,
      rejection_reason: data.status === "rejected" ? (data.reason ?? null) : null,
    };
    const { error } = await supabaseAdmin.from("sellers").update(updates as never).eq("id", data.sellerId);
    if (error) throw new Error(error.message);
    await audit(context.userId, `seller.verification.${data.status}`, data.sellerId, { reason: data.reason });

    const noticeMap = {
      approved:  { t: "✅ Your store has been approved", m: "Welcome! You can now create products and start selling.", s: "critical" as const },
      rejected:  { t: "Verification rejected", m: data.reason || "Your store was not approved. Please review and resubmit.", s: "critical" as const },
      suspended: { t: "Store suspended", m: data.reason || "Your store has been suspended by administration.", s: "critical" as const },
      pending:   { t: "Review reopened", m: "Your store is back under review.", s: "info" as const },
    };
    const n = noticeMap[data.status];
    await postNotice(data.sellerId, context.userId, n.t, n.m, n.s);
    return { ok: true };
  });

const bulkSchema = z.object({
  sellerIds: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(["approved", "rejected", "suspended"]),
  reason: z.string().max(1000).optional(),
});

export const bulkSetVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bulkSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      verification_status: data.status,
      verification_decided_at: now,
      verification_decided_by: context.userId,
      rejection_reason: data.status === "rejected" ? (data.reason ?? null) : null,
    };
    const { error } = await supabaseAdmin.from("sellers").update(updates as never).in("id", data.sellerIds);
    if (error) throw new Error(error.message);

    for (const id of data.sellerIds) {
      await audit(context.userId, `seller.verification.bulk_${data.status}`, id, { reason: data.reason });
    }
    // Single notice per seller
    const titleMap = { approved: "✅ Your store has been approved", rejected: "Verification rejected", suspended: "Store suspended" };
    const msg = data.status === "approved"
      ? "Welcome! You can now create products and start selling."
      : (data.reason || `Your store has been ${data.status} by administration.`);
    const rows = data.sellerIds.map((sellerId) => ({
      seller_id: sellerId, created_by: context.userId, title: titleMap[data.status], message: msg, severity: "critical" as const,
    }));
    await supabaseAdmin.from("seller_notices").insert(rows);
    return { ok: true, count: data.sellerIds.length };
  });

// Admin: list sellers by verification state (with extra fields for review)
export const adminListSellersForReview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(["pending", "approved", "rejected", "suspended", "all"]).default("pending") }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = supabaseAdmin.from("sellers")
      .select("id, business_name, name, slug, category, city, city_id, whatsapp_number, profile_photo_url, cover_photo_url, bio, verification_status, verification_documents, rejection_reason, created_at")
      .order("created_at", { ascending: false });
    if (data.status !== "all") q = q.eq("verification_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
