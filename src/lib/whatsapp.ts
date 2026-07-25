import { supabase } from "@/integrations/supabase/client";

// Validates and normalises a Nigerian phone number.
// Accepts: 08012345678 (11 digits), 2348012345678 (13 digits), 8012345678 (10 digits)
// Returns the E.164-style digits (without +) for wa.me, or null if invalid.
export function normaliseNigerianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "234" + digits.slice(1);
  if (!digits.startsWith("0") && !digits.startsWith("234") && digits.length === 10)
    return "234" + digits;
  return null;
}

export function validateNigerianPhone(raw: string): { valid: boolean; error?: string } {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { valid: false, error: "Please enter a phone number." };
  if (digits.length < 10) return { valid: false, error: "Number is too short — enter a valid Nigerian mobile number." };
  if (normaliseNigerianPhone(raw) === null)
    return { valid: false, error: "Enter a valid Nigerian number e.g. 08012345678 or 2348012345678." };
  return { valid: true };
}

export function buildWhatsAppUrl(phone: string, productName?: string, storeUrl?: string) {
  const clean = normaliseNigerianPhone(phone) ?? phone.replace(/\D/g, "");
  const storeLine = storeUrl ? `\n\nStore: ${storeUrl}` : "";
  const msg = productName
    ? `Hi, I saw your product on Zango. I'm interested in ${productName}.${storeLine}`
    : `Hi, I saw your store on Zango.${storeLine}`;
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
