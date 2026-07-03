import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------------------------------------------------------------------------
// Advanced search with metadata ranking
// ---------------------------------------------------------------------------
const advancedSearchSchema = z.object({
  query: z.string(),
  city: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  limit: z.number().default(40),
});

export const advancedSearchProducts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => advancedSearchSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const query = data.query.toLowerCase();

      // First, try to find products matching the metadata search index
      let qb = supabaseAdmin
        .from("products")
        .select(
          `
          id,
          title,
          name,
          price,
          image_url,
          condition,
          status,
          category,
          seller_id,
          created_at,
          sellers!inner(
            id,
            business_name,
            city,
            slug,
            whatsapp_number,
            is_verified,
            is_blocked,
            verification_status,
            profile_photo_url
          ),
          product_metadata(
            search_keywords,
            search_index,
            attributes
          )
        `
        )
        .eq("status", "active")
        .eq("sellers.is_blocked", false)
        .eq("sellers.verification_status", "approved");

      // Apply filters
      if (data.city && data.city !== "All cities") {
        qb = qb.eq("sellers.city", data.city);
      }

      if (data.category && data.category !== "All categories") {
        qb = qb.eq("category", data.category);
      }

      // Get all products (we'll filter and rank them in memory)
      const { data: allProducts, error } = await qb.limit(200);

      if (error) throw new Error(error.message);
      if (!allProducts || allProducts.length === 0) {
        return { products: [], sellers: [] };
      }

      // Score products based on search relevance
      const scoredProducts = allProducts.map((product: any) => {
        let score = 0;
        const title = (product.title || product.name || "").toLowerCase();
        const metadata = product.product_metadata?.[0];
        const searchIndex = metadata?.search_index?.toLowerCase() || "";
        const description = product.description?.toLowerCase() || "";

        // Exact title match - highest score
        if (title === query) {
          score = 100;
        }
        // Title starts with query
        else if (title.startsWith(query)) {
          score = 90;
        }
        // Title contains query
        else if (title.includes(query)) {
          score = 80;
        }
        // Search index contains query (includes keywords and category)
        else if (searchIndex.includes(query)) {
          score = 60;
        }
        // Description contains query
        else if (description.includes(query)) {
          score = 40;
        }

        // Price filtering
        if (data.minPrice && product.price < data.minPrice) {
          score = 0;
        }
        if (data.maxPrice && product.price > data.maxPrice) {
          score = 0;
        }

        return { ...product, relevance_score: score };
      });

      // Filter out zero-score products and sort by score
      const rankedProducts = scoredProducts
        .filter((p) => p.relevance_score > 0)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, data.limit);

      return { products: rankedProducts, sellers: [] };
    } catch (error) {
      console.error("[v0] Advanced search error:", error);
      return { products: [], sellers: [] };
    }
  });

// ---------------------------------------------------------------------------
// Get search suggestions from products and categories
// ---------------------------------------------------------------------------
const suggestionsSchema = z.object({
  query: z.string(),
  limit: z.number().default(5),
});

export const getSearchSuggestions = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => suggestionsSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const queryLower = data.query.toLowerCase();
      const suggestions = new Set<string>();

      // Get category suggestions
      const { data: categories, error: catError } = await supabaseAdmin
        .from("categories")
        .select("name")
        .ilike("name", `%${queryLower}%`)
        .limit(3);

      if (!catError && categories) {
        categories.forEach((c) => suggestions.add(c.name));
      }

      // Get product suggestions from titles
      const { data: products, error: prodError } = await supabaseAdmin
        .from("products")
        .select("title")
        .ilike("title", `%${queryLower}%`)
        .eq("status", "active")
        .limit(5);

      if (!prodError && products) {
        products.forEach((p) => {
          // Extract relevant portion of title
          const words = p.title.split(/\s+/);
          suggestions.add(words.join(" ").substring(0, 40));
        });
      }

      return Array.from(suggestions).slice(0, data.limit);
    } catch (error) {
      console.error("[v0] Get suggestions error:", error);
      return [];
    }
  });

// ---------------------------------------------------------------------------
// Get trending searches based on recent activity
// ---------------------------------------------------------------------------
export const getTrendingSearches = createServerFn({ method: "GET" }).handler(async () => {
  try {
    // This could be enhanced with actual search analytics table
    // For now, return popular categories and top-selling products

    const { data: categories } = await supabaseAdmin
      .from("categories")
      .select("name")
      .order("sort_order")
      .limit(10);

    return categories?.map((c) => c.name) || [];
  } catch (error) {
    console.error("[v0] Get trending error:", error);
    return [];
  }
});
