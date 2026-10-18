/**
 * Link-preview + SEO tags for product and store pages.
 *
 * WhatsApp, Facebook and Google read the HTML the SERVER sends, before any
 * React code runs. So the route loaders call these fetchers on the server, and
 * head() turns the result into real <title> / og:* tags. On client-side
 * navigation the loaders return null (no extra request, no slower page) and the
 * page shows a plain title — previews only matter for the first, server-rendered
 * request.
 *
 * Reads use the public (anon) client with the same columns the pages already
 * read, never the service-role key.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  SITE_NAME,
  absoluteImage,
  productUrl,
  safeJsonLd,
  storeUrl,
  truncate,
} from "@/lib/site";

const FETCH_TIMEOUT_MS = 3000; // crawlers give up fast — never hang the page on this
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MetaTag = Record<string, string>;
type LinkTag = Record<string, string>;
type ScriptTag = { type: string; children: string };
export interface HeadResult {
  meta: MetaTag[];
  links?: LinkTag[];
  scripts?: ScriptTag[];
}

function prettifySlug(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/* ───────────────────────────── Product ───────────────────────────── */

export interface ProductShareMeta {
  id: string;
  name: string;
  price: number | null;
  description: string | null;
  image: string | null;
  inStock: boolean;
  seller: { name: string; city: string | null };
  /** false = hidden/unavailable product → page is served but kept out of search */
  shareable: boolean;
}

export async function fetchProductShareMeta(id: string): Promise<ProductShareMeta | null> {
  if (!UUID.test(id)) return null;
  try {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, price, description, image_url, image_urls, stock_status, status, sellers!inner(business_name, city, is_blocked, verification_status)",
      )
      .eq("id", id)
      .abortSignal(AbortSignal.timeout(FETCH_TIMEOUT_MS))
      .maybeSingle();
    if (error || !data) return null;

    const row: any = data;
    const seller = row.sellers;
    if (!seller) return null;

    const gallery: string[] = Array.isArray(row.image_urls) ? row.image_urls : [];
    return {
      id: row.id,
      name: String(row.name ?? "Product"),
      price: row.price != null && Number(row.price) > 0 ? Number(row.price) : null,
      description: row.description ?? null,
      image: gallery[0] ?? row.image_url ?? null,
      inStock: row.stock_status !== "sold_out",
      seller: { name: String(seller.business_name ?? ""), city: seller.city ?? null },
      shareable:
        row.status === "active" && !seller.is_blocked && seller.verification_status === "approved",
    };
  } catch {
    return null;
  }
}

export function buildProductHead(meta: ProductShareMeta | null | undefined, id: string): HeadResult {
  const url = productUrl(id);

  // No data (client navigation, timeout, bad id): keep canonical right, skip the rest.
  if (!meta) {
    return {
      meta: [
        { title: `Product — ${SITE_NAME}` },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  }

  if (!meta.shareable) {
    return {
      meta: [
        { title: `Product unavailable — ${SITE_NAME}` },
        { name: "robots", content: "noindex" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  }

  const price = meta.price != null ? `₦${meta.price.toLocaleString("en-US")}` : null;
  const where = meta.seller.city ? `${meta.seller.name}, ${meta.seller.city}` : meta.seller.name;
  const ogTitle = truncate(
    `${meta.name}${price ? ` — ${price}` : ""} | ${meta.seller.name}`,
    90,
  );
  const blurb = truncate(meta.description, 110);
  const description = truncate(
    `${price ? `${price} · ` : ""}${where}. ${blurb ? `${blurb} ` : ""}Order on WhatsApp.`,
    200,
  );
  const image = absoluteImage(meta.image);

  const productMeta: MetaTag[] = [
    { title: `${ogTitle} · ${SITE_NAME}` },
    { name: "description", content: description },
    { property: "og:type", content: "product" },
    { property: "og:url", content: url },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: meta.name },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
  ];
  if (meta.price != null) {
    productMeta.push(
      { property: "product:price:amount", content: String(meta.price) },
      { property: "product:price:currency", content: "NGN" },
    );
  }

  return {
    meta: productMeta,
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "Product",
          name: meta.name,
          image: [image],
          description: description,
          brand: { "@type": "Brand", name: meta.seller.name },
          url,
          ...(meta.price != null
            ? {
                offers: {
                  "@type": "Offer",
                  url,
                  price: meta.price,
                  priceCurrency: "NGN",
                  availability: meta.inStock
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                },
              }
            : {}),
        }),
      },
    ],
  };
}

/* ────────────────────────────── Store ────────────────────────────── */

export interface StoreShareMeta {
  slug: string;
  name: string;
  bio: string | null;
  city: string | null;
  image: string | null;
  verified: boolean;
  shareable: boolean;
}

export async function fetchStoreShareMeta(slug: string): Promise<StoreShareMeta | null> {
  const cols =
    "slug, business_name, bio, city, profile_photo_url, cover_photo_url, is_verified, is_blocked, status, verification_status";
  try {
    let { data } = await supabase
      .from("sellers")
      .select(cols)
      .eq("slug", slug)
      .abortSignal(AbortSignal.timeout(FETCH_TIMEOUT_MS))
      .maybeSingle();

    // Same case-insensitive fallback the store page uses (slugs are lowercase).
    if (!data && slug !== slug.toLowerCase()) {
      ({ data } = await supabase
        .from("sellers")
        .select(cols)
        .eq("slug", slug.toLowerCase())
        .abortSignal(AbortSignal.timeout(FETCH_TIMEOUT_MS))
        .maybeSingle());
    }
    if (!data) return null;

    const row: any = data;
    return {
      slug: row.slug,
      name: String(row.business_name ?? prettifySlug(slug)),
      bio: row.bio ?? null,
      city: row.city ?? null,
      image: row.cover_photo_url ?? row.profile_photo_url ?? null,
      verified: !!row.is_verified,
      shareable:
        row.status === "active" && !row.is_blocked && row.verification_status === "approved",
    };
  } catch {
    return null;
  }
}

export function buildStoreHead(meta: StoreShareMeta | null | undefined, slug: string): HeadResult {
  const url = storeUrl(slug);

  // No data: keep the previous slug-based tags so nothing regresses.
  if (!meta) {
    const name = prettifySlug(slug);
    const title = `${name} — ${SITE_NAME}`;
    const description = `Shop ${name} on ${SITE_NAME}. Browse products and order directly on WhatsApp.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  }

  if (!meta.shareable) {
    return {
      meta: [
        { title: `${meta.name} — ${SITE_NAME}` },
        { name: "robots", content: "noindex" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  }

  const title = `${meta.name}${meta.city ? ` · ${meta.city}` : ""} — ${SITE_NAME}`;
  const description = truncate(
    meta.bio
      ? `${meta.bio} Order on WhatsApp.`
      : `Shop ${meta.name}${meta.city ? ` in ${meta.city}` : ""} on ${SITE_NAME}. Browse products and order directly on WhatsApp.`,
    200,
  );
  const image = absoluteImage(meta.image);

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:image", content: image },
      { property: "og:image:alt", content: meta.name },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "Store",
          name: meta.name,
          url,
          description,
          image,
          ...(meta.city
            ? {
                address: {
                  "@type": "PostalAddress",
                  addressLocality: meta.city,
                  addressCountry: "NG",
                },
              }
            : {}),
        }),
      },
    ],
  };
}
