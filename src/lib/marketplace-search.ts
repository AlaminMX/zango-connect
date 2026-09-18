import { supabase } from "@/integrations/supabase/client";
import { sanitizePostgrestLike } from "@/lib/postgrestSafe";

export type SearchSuggestionType = "product" | "category" | "brand" | "keyword";

export type SearchSuggestion = {
  id: string;
  label: string;
  type: SearchSuggestionType;
  value: string;
};

export type MarketplaceSearchProduct = {
  id: string;
  name: string;
  price: number | string | null;
  image_url: string | null;
  stock_status?: string | null;
  status?: string | null;
  seller_id: string;
  category?: string | null;
  description?: string | null;
  sellers?: {
    business_name?: string | null;
    city?: string | null;
    state?: string | null;
    state_id?: string | null;
    slug?: string | null;
    whatsapp_number?: string | null;
    category?: string | null;
    is_verified?: boolean | null;
  } | null;
  _searchScore?: number;
};

export type MarketplaceSearchSeller = {
  id: string;
  slug: string | null;
  business_name: string | null;
  category: string | null;
  city: string | null;
  state?: string | null;
  state_id?: string | null;
  profile_photo_url?: string | null;
  is_verified?: boolean | null;
  rating?: number | null;
};

export type MarketplaceSearchParams = {
  query: string;
  city?: string;
  category?: string;
  state?: string;
  limit?: number;
  includeSellers?: boolean;
  signal?: AbortSignal;
};

export type MarketplaceSearchResult = {
  products: MarketplaceSearchProduct[];
  sellers: MarketplaceSearchSeller[];
  matchedState?: string | null;
};

type SynonymGroup = { primary: string; terms: string[] };

const SEARCH_DEBOUNCE_MS = 300;
const MAX_DB_TERMS = 8;
const PRODUCT_SELECT =
  "id, name, description, category, price, image_url, stock_status, status, seller_id, sellers!inner(business_name, city, state, state_id, slug, whatsapp_number, category, is_blocked, verification_status, is_verified)";

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "Zaria",
];

export function detectStateQuery(
  rawQuery: string,
  explicitState?: string,
): { isState: boolean; matchedState?: string; isAbuja?: boolean; isZaria?: boolean; isKaduna?: boolean } {
  if (explicitState) {
    const isZaria = explicitState.toLowerCase().includes("zaria");
    const isKaduna = explicitState.toLowerCase().includes("kaduna") && !isZaria;
    return {
      isState: true,
      matchedState: isZaria ? "Zaria" : explicitState,
      isAbuja: explicitState.toLowerCase().includes("abuja") || explicitState.toLowerCase() === "fct",
      isZaria,
      isKaduna,
    };
  }
  const norm = normalizeSearchText(rawQuery);
  if (!norm) return { isState: false };

  if (norm === "abuja" || norm.includes("abuja")) {
    return { isState: true, matchedState: "FCT", isAbuja: true };
  }

  if (norm === "zaria" || norm.startsWith("zaria ") || norm.endsWith(" zaria") || norm === "zaria state") {
    return { isState: true, matchedState: "Zaria", isZaria: true };
  }

  if (norm === "kaduna" || norm.startsWith("kaduna ") || norm.endsWith(" kaduna") || norm === "kaduna state") {
    return { isState: true, matchedState: "Kaduna", isKaduna: true };
  }

  const found = NIGERIAN_STATES.find((st) => {
    const stNorm = normalizeSearchText(st);
    return norm === stNorm || norm.startsWith(`${stNorm} `) || norm.endsWith(` ${stNorm}`) || norm === `${stNorm} state`;
  });

  if (found) {
    return {
      isState: true,
      matchedState: found,
      isAbuja: found.toLowerCase() === "fct",
      isZaria: found.toLowerCase() === "zaria",
      isKaduna: found.toLowerCase() === "kaduna",
    };
  }

  return { isState: false };
}

const BASE_SYNONYM_GROUPS: SynonymGroup[] = [
  {
    primary: "phone",
    terms: [
      "phone",
      "phones",
      "mobile",
      "smartphone",
      "cell phone",
      "handset",
      "iphone",
      "android",
    ],
  },
  { primary: "laptop", terms: ["laptop", "laptops", "notebook", "computer", "pc"] },
  {
    primary: "earbuds",
    terms: [
      "earbud",
      "earbuds",
      "ear pod",
      "ear pods",
      "earpod",
      "earpods",
      "earpiece",
      "earpieces",
      "earphone",
      "earphones",
      "wireless earbuds",
      "bluetooth earbuds",
      "headphone",
      "headphones",
      "headset",
    ],
  },
  { primary: "tv", terms: ["tv", "television", "smart tv", "screen"] },
  { primary: "fridge", terms: ["fridge", "refrigerator", "freezer"] },
  {
    primary: "sneakers",
    terms: [
      "sneaker",
      "sneakers",
      "trainer",
      "trainers",
      "running shoe",
      "running shoes",
      "shoe",
      "shoes",
      "footwear",
    ],
  },
  {
    primary: "power bank",
    terms: [
      "power bank",
      "power banks",
      "powerbank",
      "portable charger",
      "battery pack",
      "battery bank",
    ],
  },
  { primary: "charger", terms: ["charger", "charging", "charge", "charges", "charged", "adapter"] },
  { primary: "usb c", terms: ["usb c", "usb-c", "usbc", "type c", "type-c"] },
  { primary: "bag", terms: ["bag", "bags", "backpack", "purse", "satchel", "handbag"] },
  { primary: "watch", terms: ["watch", "watches", "timepiece", "wristwatch"] },
];

const stopWords = new Set(["a", "an", "and", "for", "of", "the", "to", "with"]);

export { SEARCH_DEBOUNCE_MS };

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function stemToken(token: string): string {
  if (token.length <= 3) return token;
  if (token.endsWith("ies") && token.length > 4) return `${token.slice(0, -3)}y`;
  if (token.endsWith("ing") && token.length > 5) return token.slice(0, -3);
  if (token.endsWith("ers") && token.length > 5) return token.slice(0, -1);
  if (token.endsWith("er") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
  return token;
}

function tokenVariants(token: string): string[] {
  const stem = stemToken(token);
  const variants = new Set([token, stem]);
  if (!token.endsWith("s")) variants.add(`${token}s`);
  if (token.endsWith("y")) variants.add(`${token.slice(0, -1)}ies`);
  if (/(ch|sh|x|s|z)$/.test(token)) variants.add(`${token}es`);
  return [...variants].filter((v) => v.length > 1 && !stopWords.has(v));
}

export function expandSearchQuery(query: string): string[] {
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];
  const compact = compactSearchText(query);
  const terms = new Set<string>([normalized, compact]);
  const tokens = normalized.split(" ").flatMap(tokenVariants);
  tokens.forEach((token) => terms.add(token));

  for (const group of BASE_SYNONYM_GROUPS) {
    const normalizedTerms = group.terms.map(normalizeSearchText);
    const compactTerms = normalizedTerms.map((term) => term.replace(/\s+/g, ""));
    if (
      normalizedTerms.some(
        (term, index) =>
          normalized.includes(term) || term.includes(normalized) || compactTerms[index] === compact,
      )
    ) {
      group.terms.forEach((term) => {
        terms.add(normalizeSearchText(term));
        terms.add(compactSearchText(term));
      });
    }
  }

  return [...terms].filter(Boolean).sort((a, b) => b.length - a.length);
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function fieldText(product: MarketplaceSearchProduct): Record<string, string> {
  const seller = product.sellers;
  return {
    name: normalizeSearchText(product.name ?? ""),
    description: normalizeSearchText(product.description ?? ""),
    category: normalizeSearchText(product.category ?? seller?.category ?? ""),
    brand: normalizeSearchText((product as any).brand ?? (product as any).metadata?.brand ?? ""),
    state: normalizeSearchText(seller?.state ?? ""),
    city: normalizeSearchText(seller?.city ?? ""),
    sellerName: normalizeSearchText(seller?.business_name ?? ""),
    tags: normalizeSearchText(
      [
        ...(Array.isArray((product as any).tags) ? (product as any).tags : []),
        ...(Array.isArray((product as any).keywords) ? (product as any).keywords : []),
      ].join(" "),
    ),
  };
}

export function scoreProduct(product: MarketplaceSearchProduct, query: string): number {
  const normalizedQuery = normalizeSearchText(query);
  const compactQuery = compactSearchText(query);
  const expanded = expandSearchQuery(query);
  const queryTokens = normalizedQuery.split(" ").filter((t) => t && !stopWords.has(t));
  const fields = fieldText(product);
  const compactName = compactSearchText(product.name ?? "");
  let score = 0;

  // Exact name matches
  if (fields.name === normalizedQuery || compactName === compactQuery) score += 1000;
  if (fields.name.startsWith(normalizedQuery) || compactName.startsWith(compactQuery)) score += 800;

  // State, City, or Seller Name matching (Crucial for state & local discovery)
  if (fields.state && (fields.state === normalizedQuery || fields.state.includes(normalizedQuery) || normalizedQuery.includes(fields.state))) {
    score += 650;
  }
  if (fields.city && (fields.city === normalizedQuery || fields.city.includes(normalizedQuery) || normalizedQuery.includes(fields.city))) {
    score += 550;
  }
  if (fields.sellerName && (fields.sellerName === normalizedQuery || fields.sellerName.includes(normalizedQuery))) {
    score += 700;
  }

  // If flagged as coming from a vendor in the searched state, guarantee strong base score
  if ((product as any)._isStateVendorProduct && score === 0) {
    score += 450;
  }

  for (const token of queryTokens) {
    const variants = tokenVariants(token);
    if (variants.some((v) => new RegExp(`(^| )${v}( |$)`).test(fields.name))) score += 550;
    if (variants.some((v) => fields.name.includes(v))) score += 350;
    if (variants.some((v) => fields.description.includes(v))) score += 180;
    if (variants.some((v) => fields.tags.includes(v))) score += 140;
    if (variants.some((v) => fields.category.includes(v))) score += 120;
    if (variants.some((v) => fields.state.includes(v))) score += 300;
    if (variants.some((v) => fields.city.includes(v))) score += 250;
    if (variants.some((v) => fields.sellerName.includes(v))) score += 350;
    if (
      [...fields.name.split(" "), ...fields.category.split(" ")].some(
        (word) => word.length > 4 && levenshtein(token, word) <= 1,
      )
    )
      score += 90;
  }
  for (const term of expanded) {
    if (
      term !== normalizedQuery &&
      [fields.name, fields.description, fields.tags, fields.category, fields.brand, fields.state, fields.city].some((field) =>
        field.includes(term),
      )
    )
      score += 80;
  }
  return score;
}

function searchOrClause(terms: string[]): string {
  return terms
    .slice(0, MAX_DB_TERMS)
    .map((term) => {
      const safe = sanitizePostgrestLike(term);
      return `name.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`;
    })
    .join(",");
}

export async function searchMarketplace({
  query,
  city,
  category,
  state,
  limit = 40,
  includeSellers = true,
  signal,
}: MarketplaceSearchParams): Promise<MarketplaceSearchResult> {
  const normalized = normalizeSearchText(query);
  if (!normalized && !state && !city && !category) return { products: [], sellers: [] };

  const stateMatch = detectStateQuery(query, state);
  const isStateSearch = stateMatch.isState || Boolean(state);

  // When searching a state, pull all sellers from that state
  const sellerPromise = includeSellers
    ? searchSellers({
        query,
        city,
        state: state || (stateMatch.isState ? stateMatch.matchedState : undefined),
        limit: isStateSearch ? 100 : 20,
        signal,
      })
    : Promise.resolve([]);

  const terms = query ? expandSearchQuery(query) : [];
  let productData: any[] = [];
  let sellers: MarketplaceSearchSeller[] = [];
  if (!isStateSearch) {
    let productQuery = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("sellers.is_blocked", false)
      .eq("sellers.verification_status", "approved");

    if (terms.length > 0) {
      productQuery = productQuery.or(searchOrClause(terms));
    }
    if (city) productQuery = productQuery.eq("sellers.city", city);
    if (state) productQuery = productQuery.eq("sellers.state", state);
    if (category) productQuery = productQuery.eq("category", category);
    if (signal) productQuery = productQuery.abortSignal(signal);
    productQuery = productQuery.limit(Math.max(limit * 3, 60));

    const [{ data, error }, sellersResult] = await Promise.all([productQuery, sellerPromise]);
    if (error) throw error;
    productData = data ?? [];
    sellers = sellersResult;
  } else {
    sellers = await sellerPromise;
  }
  
  const byId = new Map<string, any>();
  productData.forEach((product: any) => byId.set(product.id, product));

  // If this is a state search (or if sellers were found from that state),
  // fetch EVERY single product listed by those vendors so nothing is missed
  if (isStateSearch && sellers.length > 0) {
    const sellerIds = sellers.map((s) => s.id);
    // Fetch products in chunks of 50 to respect PostgREST in URL lengths
    for (let i = 0; i < sellerIds.length; i += 50) {
      const chunk = sellerIds.slice(i, i + 50);
      let stateProdQuery = supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .in("seller_id", chunk)
        .eq("status", "active")
        .eq("sellers.is_blocked", false)
        .eq("sellers.verification_status", "approved");
      if (category) stateProdQuery = stateProdQuery.eq("category", category);
      if (signal) stateProdQuery = stateProdQuery.abortSignal(signal);

      const { data: stateVendorProds, error: svpError } = await stateProdQuery;
      if (!svpError && stateVendorProds) {
        stateVendorProds.forEach((p: any) => {
          (p as any)._isStateVendorProduct = true;
          byId.set(p.id, p);
        });
      }
    }
  }

  let candidates = [...byId.values()];

  // If literal/expanded database matching is too sparse and not a state search,
  // do one bounded fallback pass for typo tolerance
  if (!isStateSearch && candidates.length < Math.min(8, limit)) {
    let fallbackQuery = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("sellers.is_blocked", false)
      .eq("sellers.verification_status", "approved")
      .limit(500);
    if (city) fallbackQuery = fallbackQuery.eq("sellers.city", city);
    if (state) fallbackQuery = fallbackQuery.eq("sellers.state", state);
    if (category) fallbackQuery = fallbackQuery.eq("category", category);
    if (signal) fallbackQuery = fallbackQuery.abortSignal(signal);
    const { data: fallbackData, error: fallbackError } = await fallbackQuery;
    if (fallbackError) throw fallbackError;
    (fallbackData ?? []).forEach((product: any) => byId.set(product.id, product));
    candidates = [...byId.values()];
  }

  let ranked = candidates
    .map((product) => ({ ...product, _searchScore: scoreProduct(product, query) }))
    .filter((product) => (isStateSearch ? true : product._searchScore > 0))
    .sort((a, b) => (b._searchScore ?? 0) - (a._searchScore ?? 0) || String(a.name).localeCompare(String(b.name)));

  // Strict separation for Zaria vs Kaduna
  if (stateMatch.isZaria || state?.toLowerCase() === "zaria") {
    ranked = ranked.filter(
      (p) =>
        p.sellers?.city?.toLowerCase().includes("zaria") ||
        p.sellers?.state?.toLowerCase() === "zaria" ||
        (p as any)._isStateVendorProduct,
    );
  } else if (stateMatch.isKaduna || state?.toLowerCase() === "kaduna") {
    ranked = ranked.filter(
      (p) =>
        !p.sellers?.city?.toLowerCase().includes("zaria") &&
        p.sellers?.state?.toLowerCase() !== "zaria",
    );
  }

  // When searching a state, show every single product listed by vendors from that state without artificial truncation
  const effectiveLimit = isStateSearch ? Math.max(limit, ranked.length) : limit;
  const finalProducts = ranked.slice(0, effectiveLimit);

  return {
    products: finalProducts,
    sellers,
    matchedState: stateMatch.matchedState ?? null,
  };
}

async function searchSellers({
  query,
  city,
  state,
  limit = 20,
  signal,
}: MarketplaceSearchParams): Promise<MarketplaceSearchSeller[]> {
  const norm = normalizeSearchText(query);
  const safe = sanitizePostgrestLike(norm);
  const stateMatch = detectStateQuery(norm, state);

  // Dedicated Zaria seller query
  if (stateMatch.isZaria || state?.toLowerCase() === "zaria") {
    let qb = supabase
      .from("sellers")
      .select("id, slug, business_name, category, city, state, state_id, profile_photo_url, is_verified, rating")
      .eq("is_blocked", false)
      .eq("verification_status", "approved")
      .or("city.ilike.%zaria%,state.ilike.%zaria%,business_name.ilike.%zaria%");

    if (signal) qb = qb.abortSignal(signal);
    qb = qb.limit(limit);
    const { data, error } = await qb;
    if (error) throw error;
    return ((data ?? []) as MarketplaceSearchSeller[]).filter(
      (s) =>
        s.city?.toLowerCase().includes("zaria") ||
        s.state?.toLowerCase() === "zaria" ||
        s.business_name?.toLowerCase().includes("zaria"),
    );
  }

  // Dedicated Kaduna seller query (strictly excludes Zaria)
  if (stateMatch.isKaduna || state?.toLowerCase() === "kaduna") {
    let qb = supabase
      .from("sellers")
      .select("id, slug, business_name, category, city, state, state_id, profile_photo_url, is_verified, rating")
      .eq("is_blocked", false)
      .eq("verification_status", "approved")
      .or("city.ilike.%kaduna%,business_name.ilike.%kaduna%");

    if (signal) qb = qb.abortSignal(signal);
    qb = qb.limit(limit);
    const { data, error } = await qb;
    if (error) throw error;
    return ((data ?? []) as MarketplaceSearchSeller[]).filter(
      (s) =>
        !s.city?.toLowerCase().includes("zaria") &&
        s.state?.toLowerCase() !== "zaria" &&
        (s.city?.toLowerCase().includes("kaduna") || s.business_name?.toLowerCase().includes("kaduna")),
    );
  }

  let stateIds: string[] = [];
  if (stateMatch.isState || state) {
    const term = state || stateMatch.matchedState || norm;
    const safeTerm = sanitizePostgrestLike(term);
    const { data: stData } = await supabase
      .from("states")
      .select("id, name, slug")
      .or(
        `name.ilike.%${safeTerm}%,slug.ilike.%${safeTerm}%${
          stateMatch.isAbuja || term.toLowerCase().includes("abuja") ? ",name.eq.FCT" : ""
        }`,
      )
      .abortSignal(signal ?? AbortSignal.timeout(8000));
    if (stData) {
      stateIds = stData.map((s: any) => s.id);
    }
  }

  let qb = supabase
    .from("sellers")
    .select("id, slug, business_name, category, city, state, state_id, profile_photo_url, is_verified, rating")
    .eq("is_blocked", false)
    .eq("verification_status", "approved");

  if (stateIds.length > 0) {
    const term = state || stateMatch.matchedState || norm;
    const safeTerm = sanitizePostgrestLike(term);
    qb = qb.or(
      `state_id.in.(${stateIds.join(",")}),state.ilike.%${safeTerm}%,city.ilike.%${safeTerm}%,business_name.ilike.%${safeTerm}%,name.ilike.%${safeTerm}%`,
    );
  } else {
    qb = qb.or(
      `business_name.ilike.%${safe}%,name.ilike.%${safe}%,bio.ilike.%${safe}%,city.ilike.%${safe}%,state.ilike.%${safe}%,category.ilike.%${safe}%`,
    );
  }

  if (city) qb = qb.eq("city", city);
  if (signal) qb = qb.abortSignal(signal);
  qb = qb.limit(limit);

  const { data, error } = await qb;
  if (error) throw error;
  return (data ?? []) as MarketplaceSearchSeller[];
}

export async function getSearchSuggestions(
  query: string,
  signal?: AbortSignal,
  limit = 8,
): Promise<SearchSuggestion[]> {
  const norm = normalizeSearchText(query);
  if (!norm) return [];
  const terms = expandSearchQuery(query);
  const safe = sanitizePostgrestLike(terms[0] || norm);

  const [products, categories, states] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, category")
      .or(`name.ilike.%${safe}%,category.ilike.%${safe}%`)
      .eq("status", "active")
      .limit(12)
      .abortSignal(signal ?? AbortSignal.timeout(8000)),
    supabase
      .from("categories")
      .select("id, name")
      .ilike("name", `%${safe}%`)
      .limit(6)
      .abortSignal(signal ?? AbortSignal.timeout(8000)),
    supabase
      .from("states")
      .select("id, name")
      .ilike("name", `%${safe}%`)
      .limit(5)
      .abortSignal(signal ?? AbortSignal.timeout(8000)),
  ]);

  if (products.error) throw products.error;
  if (categories.error) throw categories.error;

  const seen = new Set<string>();
  const suggestions: SearchSuggestion[] = [];
  const add = (item: SearchSuggestion) => {
    const key = `${item.type}:${normalizeSearchText(item.label)}`;
    if (!seen.has(key) && suggestions.length < limit) {
      seen.add(key);
      suggestions.push(item);
    }
  };

  // State suggestions
  (states.data ?? []).forEach((s: any) =>
    add({ id: `state-${s.id}`, label: `${s.name} State`, value: s.name, type: "location" }),
  );

  // Check matching predefined Nigerian states as well
  NIGERIAN_STATES.filter((st) => normalizeSearchText(st).startsWith(norm)).forEach((st) =>
    add({ id: `state-${st}`, label: `${st} State`, value: st, type: "location" }),
  );

  (products.data ?? []).forEach((p: any) =>
    add({ id: `product-${p.id}`, label: p.name, value: p.name, type: "product" }),
  );
  (categories.data ?? []).forEach((c: any) =>
    add({ id: `category-${c.id}`, label: c.name, value: c.name, type: "category" }),
  );
  terms
    .slice(0, 5)
    .forEach((term) => add({ id: `keyword-${term}`, label: term, value: term, type: "keyword" }));

  return suggestions;
}
