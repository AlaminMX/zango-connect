import { supabase } from "@/integrations/supabase/client";

export function buildWhatsAppUrl(phone: string, productName?: string) {
  const clean = phone.replace(/[^\d]/g, "");
  const msg = productName
    ? `Hi, I saw your listing on Sutura Market. I'm interested in ${productName}.`
    : `Hi, I saw your store on Sutura Market.`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

export async function trackClick(sellerId: string, productId?: string) {
  try {
    await supabase.from("whatsapp_clicks").insert({ seller_id: sellerId, product_id: productId ?? null });
  } catch {
    // best effort
  }
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}
