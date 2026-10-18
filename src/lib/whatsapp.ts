import { supabase } from "@/integrations/supabase/client";
import { attributionFields } from "@/lib/attribution";

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
  if (digits.length < 10)
    return { valid: false, error: "Number is too short — enter a valid Nigerian mobile number." };
  if (normaliseNigerianPhone(raw) === null)
    return {
      valid: false,
      error: "Enter a valid Nigerian number e.g. 08012345678 or 2348012345678.",
    };
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

// Ignore an identical tap (same vendor + product) within this window so a
// double-tap doesn't count as two leads.
const TAP_GUARD_MS = 3000;
const lastTap = new Map<string, number>();

// Logs a WhatsApp tap, tagged with the visitor's ?ref= channel and anonymous
// visitor id. Best effort: never throws, never blocks the click. supabase-js
// returns { error } instead of throwing, so the error is checked and logged.
export async function trackClick(sellerId: string, productId?: string) {
  if (typeof window === "undefined") return;
  try {
    const key = `${sellerId}:${productId ?? ""}`;
    const now = Date.now();
    const prev = lastTap.get(key);
    if (prev && now - prev < TAP_GUARD_MS) return;
    lastTap.set(key, now);

    const row = {
      seller_id: sellerId,
      product_id: productId ?? null,
      ...attributionFields(),
    };
    // Cast: `ref` / `visitor_id` are new columns; this stays valid whether or
    // not types.ts has been regenerated yet.
    const { error } = await supabase.from("whatsapp_clicks").insert(row as never);
    if (error) console.warn("[trackClick] insert rejected:", error.message);
  } catch {
    // best effort
  }
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
