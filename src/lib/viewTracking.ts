import { supabase } from "@/integrations/supabase/client";

// Fires a best-effort page_views insert. Same shape as trackClick() in
// whatsapp.ts: never throws, never blocks the UI, silently no-ops if the
// insert fails (e.g. offline). Call once per mount of a store or product
// page — see store.$slug.tsx and product.$id.tsx for the call sites.
export async function trackView(
  targetType: "store" | "product",
  targetId: string,
  sellerId: string
) {
  try {
    await supabase.from("page_views").insert({
      target_type: targetType,
      target_id: targetId,
      seller_id: sellerId,
    });
  } catch {
    // best effort — a missed view log should never break the page
  }
}
