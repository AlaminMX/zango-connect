import { getSynonymGroups } from "./search-metadata.functions";

export interface SearchResult {
  productId: string;
  title: string;
  sellerId: string;
  sellerName: string;
  price: number;
  image?: string;
  category: string;
  score: number;
  matchType: "exact_title" | "title_keyword" | "category_keyword" | "description_keyword" | "synonym_match";
}

// ---------------------------------------------------------------------------
// Search score calculation
// ---------------------------------------------------------------------------
function calculateRelevanceScore(
  query: string,
  title: string,
  searchIndex: string,
  matchType: SearchResult["matchType"],
  isFeatured?: boolean,
): number {
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();

  let baseScore = 0;

  // Match type weights
  switch (matchType) {
    case "exact_title":
      baseScore = 100;
      break;
    case "title_keyword":
      baseScore = 80;
      break;
    case "category_keyword":
      baseScore = 50;
      break;
    case "description_keyword":
      baseScore = 30;
      break;
    case "synonym_match":
      baseScore = 40;
      break;
  }

  // Boost if query matches at the beginning of title
  if (titleLower.startsWith(queryLower)) {
    baseScore *= 1.3;
  }

  // Boost featured sellers
  if (isFeatured) {
    baseScore *= 1.2;
  }

  return baseScore;
}

// ---------------------------------------------------------------------------
// Query expansion with synonyms
// ---------------------------------------------------------------------------
function expandQueryWithSynonyms(query: string, synonymGroups: Array<any>): string[] {
  const variants = [query.toLowerCase()];

  const queryWords = query.toLowerCase().split(/\s+/);

  for (const group of synonymGroups) {
    for (const word of queryWords) {
      if (group.primary_term === word) {
        variants.push(...group.synonyms);
      }
      if (group.synonyms.includes(word)) {
        variants.push(group.primary_term);
      }
    }
  }

  return [...new Set(variants)]; // Remove duplicates
}

// ---------------------------------------------------------------------------
// Main search function (client-side filtering)
// Note: In production, this would call a server-side search API
// ---------------------------------------------------------------------------
export async function performAdvancedSearch(
  query: string,
  products: Array<any>,
  synonymGroups?: Array<any>,
  options: { category?: string; maxResults?: number } = {},
): Promise<SearchResult[]> {
  const maxResults = options.maxResults || 50;
  const queryLower = query.toLowerCase();
  const expandedQueries = synonymGroups ? expandQueryWithSynonyms(query, synonymGroups) : [queryLower];

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (const product of products) {
    if (seen.has(product.id)) continue;

    const titleLower = product.title.toLowerCase();
    const searchIndex = product.search_index?.toLowerCase() || "";
    const descriptionLower = product.description?.toLowerCase() || "";

    let matchType: SearchResult["matchType"] | null = null;
    let score = 0;

    // 1. Exact title match
    if (titleLower === queryLower) {
      matchType = "exact_title";
      score = calculateRelevanceScore(query, product.title, searchIndex, matchType, product.is_featured);
    }
    // 2. Title contains query
    else if (titleLower.includes(queryLower)) {
      matchType = "title_keyword";
      score = calculateRelevanceScore(query, product.title, searchIndex, matchType, product.is_featured);
    }
    // 3. Search index match (includes category, keywords)
    else if (searchIndex.includes(queryLower)) {
      matchType = "category_keyword";
      score = calculateRelevanceScore(query, product.title, searchIndex, matchType, product.is_featured);
    }
    // 4. Description match
    else if (descriptionLower.includes(queryLower)) {
      matchType = "description_keyword";
      score = calculateRelevanceScore(query, product.title, searchIndex, matchType, product.is_featured);
    }
    // 5. Synonym match
    else {
      for (const expandedQuery of expandedQueries) {
        if (titleLower.includes(expandedQuery) || searchIndex.includes(expandedQuery)) {
          matchType = "synonym_match";
          score = calculateRelevanceScore(query, product.title, searchIndex, matchType, product.is_featured);
          break;
        }
      }
    }

    // Filter by category if provided
    if (options.category && product.category !== options.category) {
      matchType = null;
    }

    if (matchType) {
      results.push({
        productId: product.id,
        title: product.title,
        sellerId: product.seller_id,
        sellerName: product.seller_name || "Unknown",
        price: product.price,
        image: product.image,
        category: product.category,
        score,
        matchType,
      });

      seen.add(product.id);
    }
  }

  // Sort by score (descending) and return top results
  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

// ---------------------------------------------------------------------------
// Filter results by category and price
// ---------------------------------------------------------------------------
export function filterSearchResults(
  results: SearchResult[],
  filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
  },
): SearchResult[] {
  return results.filter((result) => {
    if (filters.category && result.category !== filters.category) return false;
    if (filters.minPrice && result.price < filters.minPrice) return false;
    if (filters.maxPrice && result.price > filters.maxPrice) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Get search suggestions based on partial query
// ---------------------------------------------------------------------------
export function getSearchSuggestions(
  partialQuery: string,
  products: Array<any>,
  limit: number = 5,
): string[] {
  const suggestions = new Set<string>();
  const queryLower = partialQuery.toLowerCase();

  // Extract title suggestions
  for (const product of products) {
    const titleLower = product.title.toLowerCase();
    if (titleLower.includes(queryLower)) {
      // Extract the relevant part of the title
      const words = titleLower.split(/\s+/);
      const relevantWords = words.filter((w) => w.includes(queryLower) || words.indexOf(w) > 0);
      suggestions.add(relevantWords.join(" ").substring(0, 50));
    }
  }

  // Add category suggestions
  const categories = new Set(products.map((p) => p.category));
  for (const category of categories) {
    if (category.toLowerCase().includes(queryLower)) {
      suggestions.add(category);
    }
  }

  return Array.from(suggestions).slice(0, limit);
}
