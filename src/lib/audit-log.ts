import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "featured_product_added"
  | "featured_product_removed"
  | "featured_products_reordered"
  | "trending_seller_added"
  | "trending_seller_removed"
  | "trending_sellers_reordered"
  | "vendor_approved"
  | "vendor_rejected"
  | "vendor_blocked"
  | "vendor_unblocked";

export interface AuditLogEntry {
  admin_id: string;
  action: AuditAction;
  entity_type: "product" | "seller" | "vendor" | "cms";
  entity_id?: string;
  details?: Record<string, any>;
}

/**
 * Log an admin action to the audit log
 * Used to track all CMS changes and vendor approvals
 */
export async function logAuditAction(entry: AuditLogEntry): Promise<boolean> {
  try {
    const { error } = await supabase.from("admin_audit_log").insert({
      admin_id: entry.admin_id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      details: entry.details || {},
    });

    if (error) {
      console.error("[audit-log] Failed to log action:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[audit-log] Unexpected error:", err);
    return false;
  }
}

/**
 * Convenience function for logging featured product actions
 */
export async function logFeaturedProductAction(
  adminId: string,
  action: "featured_product_added" | "featured_product_removed" | "featured_products_reordered",
  productId?: string,
  details?: Record<string, any>
) {
  return logAuditAction({
    admin_id: adminId,
    action,
    entity_type: "product",
    entity_id: productId,
    details,
  });
}

/**
 * Convenience function for logging trending seller actions
 */
export async function logTrendingSellerAction(
  adminId: string,
  action: "trending_seller_added" | "trending_seller_removed" | "trending_sellers_reordered",
  sellerId?: string,
  details?: Record<string, any>
) {
  return logAuditAction({
    admin_id: adminId,
    action,
    entity_type: "seller",
    entity_id: sellerId,
    details,
  });
}

/**
 * Convenience function for logging vendor approval/rejection
 */
export async function logVendorAction(
  adminId: string,
  action: "vendor_approved" | "vendor_rejected" | "vendor_blocked" | "vendor_unblocked",
  vendorId: string,
  details?: Record<string, any>
) {
  return logAuditAction({
    admin_id: adminId,
    action,
    entity_type: "vendor",
    entity_id: vendorId,
    details,
  });
}
