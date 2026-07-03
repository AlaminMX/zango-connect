import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------------------------------------------------------------------------
// Category-specific attributes schema
// ---------------------------------------------------------------------------
export const CATEGORY_ATTRIBUTES: Record<string, { name: string; values?: string[] }[]> = {
  "Fashion & Clothing": [
    { name: "Size", values: ["XS", "S", "M", "L", "XL", "XXL"] },
    { name: "Color", values: ["Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Brown", "Gray", "Multicolor"] },
    { name: "Material", values: ["Cotton", "Polyester", "Silk", "Wool", "Linen", "Denim", "Leather"] },
    { name: "Condition", values: ["New", "Like New", "Gently Used", "Used"] },
  ],
  "Beauty & Skincare": [
    { name: "Brand" },
    { name: "Product Type", values: ["Face Cream", "Face Wash", "Moisturizer", "Serum", "Mask", "Cleanser", "Sunscreen", "Body Lotion"] },
    { name: "Skin Type", values: ["Oily", "Dry", "Combination", "Sensitive", "Normal"] },
    { name: "Volume" },
  ],
  "Home & Living": [
    { name: "Material", values: ["Wood", "Metal", "Plastic", "Ceramic", "Glass", "Fabric"] },
    { name: "Color" },
    { name: "Size/Capacity" },
    { name: "Condition", values: ["New", "Like New", "Used"] },
  ],
  "Food & Homemade Goods": [
    { name: "Type" },
    { name: "Weight/Quantity" },
    { name: "Ingredients Highlight" },
    { name: "Shelf Life" },
  ],
  "Accessories": [
    { name: "Type", values: ["Bag", "Watch", "Necklace", "Bracelet", "Ring", "Hat", "Scarf", "Belt"] },
    { name: "Material" },
    { name: "Color" },
    { name: "Condition", values: ["New", "Like New", "Used"] },
  ],
  "Crafts & Handmade": [
    { name: "Type" },
    { name: "Materials Used" },
    { name: "Size" },
    { name: "Customization" },
  ],
};

// ---------------------------------------------------------------------------
// Synonym groups for expanded search
// ---------------------------------------------------------------------------
export const DEFAULT_SYNONYM_GROUPS: Array<{ primary: string; synonyms: string[] }> = [
  { primary: "perfume", synonyms: ["fragrance", "scent", "cologne", "spray"] },
  { primary: "phone", synonyms: ["smartphone", "mobile", "cellular", "handset"] },
  { primary: "shoes", synonyms: ["footwear", "sneakers", "boots", "sandals", "heels"] },
  { primary: "dress", synonyms: ["gown", "frock", "clothing", "garment", "outfit"] },
  { primary: "bag", synonyms: ["purse", "handbag", "satchel", "tote", "backpack"] },
  { primary: "jewelry", synonyms: ["jewel", "accessory", "ornament", "adornment"] },
  { primary: "sofa", synonyms: ["couch", "settee", "seating", "furniture"] },
  { primary: "table", synonyms: ["desk", "dining", "furniture", "surface"] },
  { primary: "cake", synonyms: ["pastry", "dessert", "baked", "confectionery"] },
  { primary: "cream", synonyms: ["moisturizer", "lotion", "balm", "skincare"] },
];

// ---------------------------------------------------------------------------
// Metadata generation logic
// ---------------------------------------------------------------------------
export function generateSearchKeywords(
  title: string,
  description: string,
  category: string,
  condition?: string,
): string[] {
  const keywords = new Set<string>();

  // Add title words (individually and as phrases)
  const titleWords = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  titleWords.forEach((w) => keywords.add(w));

  // Add bigrams from title (e.g., "blue dress" -> "blue dress")
  for (let i = 0; i < titleWords.length - 1; i++) {
    keywords.add(`${titleWords[i]} ${titleWords[i + 1]}`);
  }

  // Add category
  keywords.add(category.toLowerCase());

  // Add condition if present
  if (condition) {
    keywords.add(condition.toLowerCase());
  }

  // Extract nouns from description (basic extraction)
  const descWords = description.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !["this", "that", "have", "will", "very"].includes(w));
  descWords.slice(0, 10).forEach((w) => keywords.add(w));

  return Array.from(keywords);
}

export function generateSearchIndex(keywords: string[]): string {
  // Full-text search index - simple concatenation with spaces
  return keywords.join(" ");
}

// ---------------------------------------------------------------------------
// Server-side metadata generation and storage
// ---------------------------------------------------------------------------
const generateMetadataSchema = z.object({
  productId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  condition: z.string().optional(),
  attributes: z.record(z.any()).optional(),
});

export const generateProductMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => generateMetadataSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const keywords = generateSearchKeywords(data.title, data.description, data.category, data.condition);
      const searchIndex = generateSearchIndex(keywords);

      // Check if metadata exists
      const { data: existing } = await supabaseAdmin
        .from("product_metadata")
        .select("id")
        .eq("product_id", data.productId)
        .maybeSingle();

      if (existing) {
        // Update existing metadata
        const { error } = await supabaseAdmin
          .from("product_metadata")
          .update({
            search_keywords: keywords,
            search_index: searchIndex,
            attributes: data.attributes || {},
            metadata_version: 1,
            updated_at: new Date().toISOString(),
          })
          .eq("product_id", data.productId);

        if (error) throw new Error(error.message);
      } else {
        // Create new metadata
        const { error } = await supabaseAdmin.from("product_metadata").insert({
          product_id: data.productId,
          search_keywords: keywords,
          search_index: searchIndex,
          attributes: data.attributes || {},
          metadata_version: 1,
        });

        if (error) throw new Error(error.message);
      }

      return { ok: true, keywords };
    } catch (error) {
      console.error("[v0] Metadata generation error:", error);
      throw error;
    }
  });

// ---------------------------------------------------------------------------
// Batch regenerate metadata for all products
// ---------------------------------------------------------------------------
const batchRegenerateSchema = z.object({
  category: z.string().optional(),
  limit: z.number().default(100),
});

export const batchRegenerateMetadata = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => batchRegenerateSchema.parse(d))
  .handler(async ({ data, context }) => {
    try {
      // Check admin permission
      const { data: adminCheck } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminCheck) {
        throw new Error("Forbidden: admin only");
      }

      // Fetch products to regenerate
      let query = supabaseAdmin.from("products").select("id, title, description, category, condition").limit(data.limit);

      if (data.category) {
        query = query.eq("category", data.category);
      }

      const { data: products, error } = await query;

      if (error) throw new Error(error.message);
      if (!products || products.length === 0) {
        return { ok: true, count: 0 };
      }

      // Generate and store metadata for each product
      let successCount = 0;
      for (const product of products) {
        try {
          const keywords = generateSearchKeywords(product.title, product.description, product.category, product.condition);
          const searchIndex = generateSearchIndex(keywords);

          const { data: existing } = await supabaseAdmin
            .from("product_metadata")
            .select("id")
            .eq("product_id", product.id)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from("product_metadata")
              .update({
                search_keywords: keywords,
                search_index: searchIndex,
                metadata_version: 1,
                updated_at: new Date().toISOString(),
              })
              .eq("product_id", product.id);
          } else {
            await supabaseAdmin.from("product_metadata").insert({
              product_id: product.id,
              search_keywords: keywords,
              search_index: searchIndex,
              metadata_version: 1,
            });
          }

          successCount++;
        } catch (err) {
          console.error(`[v0] Failed to regenerate metadata for product ${product.id}:`, err);
        }
      }

      return { ok: true, count: successCount };
    } catch (error) {
      console.error("[v0] Batch regeneration error:", error);
      throw error;
    }
  });

// ---------------------------------------------------------------------------
// Synonym management
// ---------------------------------------------------------------------------
const addSynonymGroupSchema = z.object({
  primaryTerm: z.string(),
  synonyms: z.array(z.string()).min(1),
});

export const addSynonymGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => addSynonymGroupSchema.parse(d))
  .handler(async ({ data, context }) => {
    try {
      // Check admin permission
      const { data: adminCheck } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", context.userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminCheck) {
        throw new Error("Forbidden: admin only");
      }

      const { error } = await supabaseAdmin.from("synonym_groups").insert({
        primary_term: data.primaryTerm.toLowerCase(),
        synonyms: data.synonyms.map((s) => s.toLowerCase()),
      });

      if (error) throw new Error(error.message);

      return { ok: true };
    } catch (error) {
      console.error("[v0] Add synonym error:", error);
      throw error;
    }
  });

// ---------------------------------------------------------------------------
// Fetch synonym groups for client-side search expansion
// ---------------------------------------------------------------------------
export const getSynonymGroups = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { data, error } = await supabaseAdmin.from("synonym_groups").select("primary_term, synonyms");

    if (error) throw new Error(error.message);

    return data || [];
  } catch (error) {
    console.error("[v0] Get synonyms error:", error);
    return [];
  }
});

// ---------------------------------------------------------------------------
// Update product attributes
// ---------------------------------------------------------------------------
const updateAttributesSchema = z.object({
  productId: z.string().uuid(),
  attributes: z.record(z.any()),
});

export const updateProductAttributes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateAttributesSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { error } = await supabaseAdmin
        .from("product_metadata")
        .update({
          attributes: data.attributes,
          updated_at: new Date().toISOString(),
        })
        .eq("product_id", data.productId);

      if (error) throw new Error(error.message);

      return { ok: true };
    } catch (error) {
      console.error("[v0] Update attributes error:", error);
      throw error;
    }
  });
