import { supabase } from "@/integrations/supabase/client";
import { attributionFields } from "@/lib/attribution";

// Fires a best-effort page_views insert, tagged with the visitor's ?ref= channel
// and anonymous visitor id. Same shape as trackClick() in whatsapp.ts: never
// throws, never blocks the UI. Call once per mount of a store or product page —
// see store.$slug.tsx and product.$id.tsx for the call sites.
//
// Dedupe: the same browser viewing the same store/product again within 30
// minutes (refresh, back button, bouncing between pages) counts once.
//
// Note: supabase-js does NOT throw on a rejected insert (e.g. an RLS policy) —
// it returns { error }. That is how store views were silently lost before, so
// the error is now checked and logged to the console.

const DEDUPE_WINDOW_MS = 30 * 60 * 1000;
const STORAGE_PREFIX = "zango:view:";
const recentViews = new Map<string, number>();

function alreadyLogged(key: string): boolean {
  const now = Date.now();
  const inMemory = recentViews.get(key);
  if (inMemory && now - inMemory < DEDUPE_WINDOW_MS) return true;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_PREFIX + key);
    const ts = raw ? Number(raw) : 0;
    if (ts && now - ts < DEDUPE_WINDOW_MS) {
      recentViews.set(key, ts);
      return true;
    }
    window.sessionStorage.setItem(STORAGE_PREFIX + key, String(now));
  } catch {
    // storage blocked — the in-memory map still dedupes within this page load
  }
  recentViews.set(key, now);
  return false;
}

export async function trackView(
  targetType: "store" | "product",
  targetId: string,
  sellerId: string,
) {
  if (typeof window === "undefined") return;
  try {
    if (alreadyLogged(`${targetType}:${targetId}`)) return;

    const row = {
      target_type: targetType,
      target_id: targetId,
      seller_id: sellerId,
      ...attributionFields(),
    };
    // Cast: `ref` / `visitor_id` are new columns; this stays valid whether or
    // not types.ts has been regenerated yet.
    const { error } = await supabase.from("page_views").insert(row as never);
    if (error) console.warn("[trackView] insert rejected:", error.message);
  } catch {
    // best effort — a missed view log should never break the page
  }
}
  
