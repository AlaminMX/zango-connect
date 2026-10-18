/**
 * Site-wide constants and URL helpers — the ONE place the public domain lives.
 *
 * If ZANGO moves to its own domain (e.g. zango.ng), change SITE_ORIGIN here and
 * every canonical URL, og:url, JSON-LD block and share link follows.
 *
 * Note: src/lib/vendor-card/share.ts and src/lib/vendor-card/themes.ts still
 * carry their own copy of the same origin. They already match this value, so
 * nothing is broken today — just update them too if the domain ever changes.
 */

export const SITE_ORIGIN = "https://zango-connect.vercel.app";
export const SITE_NAME = "ZANGO";

/** Fallback preview image when a page has no photo of its own. */
export const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/sgPidVUphLSGVGq51GiPoIX6I323/social-images/social-1784011047122-ChatGPT_Image_Jul_14,_2026,_07_37_16_AM.webp";

/** Absolute URL on the public site. `path` may or may not start with "/". */
export function absoluteUrl(path = "/"): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

function withRef(url: string, ref?: string): string {
  return ref ? `${url}?ref=${encodeURIComponent(ref)}` : url;
}

/** Public product link. Pass a `ref` tag to attribute traffic (see attribution.ts). */
export function productUrl(id: string, ref?: string): string {
  return withRef(absoluteUrl(`/product/${id}`), ref);
}

/** Public store link. Pass a `ref` tag to attribute traffic (see attribution.ts). */
export function storeUrl(slug: string, ref?: string): string {
  const clean = (slug || "").trim().replace(/^\/+|\/+$/g, "");
  return withRef(absoluteUrl(`/store/${clean}`), ref);
}

/** Link-preview crawlers need an absolute http(s) image; anything else falls back. */
export function absoluteImage(url?: string | null): string {
  return url && /^https?:\/\//i.test(url) ? url : DEFAULT_OG_IMAGE;
}

/** Collapses whitespace and cuts to `max` characters with an ellipsis. */
export function truncate(text: string | null | undefined, max: number): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * JSON for a <script type="application/ld+json"> block. Vendors type product and
 * store names, so "<" is escaped — otherwise a name containing "</script>" could
 * break out of the tag.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
