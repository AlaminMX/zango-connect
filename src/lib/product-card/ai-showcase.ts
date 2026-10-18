/**
 * Photorealistic AI Showcase Photography Service
 * Provides authentic, high-definition showcase images tailored to northern Nigerian products
 * (leather footwear, kaftans & royal textiles, perfumes/incense, artisanal crafts, spices & grains).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SHOWCASE_PHOTOGRAPHY = [
  {
    id: "leather-sandals",
    title: "Handcrafted Leather Sandals",
    category: "accessories",
    keywords: ["sandals", "shoes", "leather", "slippers", "footwear", "takalmi"],
    url: "/src/assets/images/leather_sandals_showcase_1792310693697.jpg",
    description: "Commercial studio photograph of handcrafted northern Nigerian leather sandals on polished terracotta podium",
  },
  {
    id: "traditional-kaftan",
    title: "Royal Embroidered Kaftan",
    category: "fashion",
    keywords: ["kaftan", "agbada", "embroidery", "babban riga", "fabric", "textile", "attire", "dress"],
    url: "/src/assets/images/traditional_kaftan_showcase_1792310693282.jpg",
    description: "Royal hand-embroidered kaftan fabric neatly folded on dark teakwood table with gold accents",
  },
  {
    id: "turaren-wuta",
    title: "Amber Oud & Exotic Incense",
    category: "beauty",
    keywords: ["perfume", "oil", "oud", "incense", "turare", "turaren wuta", "scent", "fragrance"],
    url: "/src/assets/images/turaren_wuta_incense_1792310694816.jpg",
    description: "Luxury amber perfume oud bottles and aromatic incense wood chips in ornate brass burner",
  },
  {
    id: "northern-spices",
    title: "Northern Gourmet Spices & Grains",
    category: "food",
    keywords: ["spice", "pepper", "kilishi", "grain", "suya", "yaji", "food", "seasoning"],
    url: "/src/assets/images/northern_spices_grains_1792310695221.jpg",
    description: "Gourmet food photography of northern Nigerian spices, dried chili peppers, and golden grains",
  },
  {
    id: "artisan-bag",
    title: "Artisanal Kano Dyed Leather Bag",
    category: "crafts",
    keywords: ["bag", "handbag", "purse", "leather bag", "tote", "wallet", "briefcase"],
    url: "/src/assets/images/artisan_leather_bag_1792310695554.jpg",
    description: "Luxury artisanal Kano dyed leather messenger tote bag with polished brass buckles",
  },
];

export function matchShowcaseImage(productName?: string, category?: string, cycleIndex = 0): string {
  const query = `${productName || ""} ${category || ""}`.toLowerCase();
  
  // Find matching items by keyword
  const matches = SHOWCASE_PHOTOGRAPHY.filter((item) =>
    item.keywords.some((kw) => query.includes(kw.toLowerCase())) ||
    (category && item.category.toLowerCase() === category.toLowerCase())
  );

  const pool = matches.length > 0 ? matches : SHOWCASE_PHOTOGRAPHY;
  const picked = pool[cycleIndex % pool.length];
  return picked.url;
}

const regenerateSchema = z.object({
  productName: z.string(),
  category: z.string().optional(),
  currentImageUrl: z.string().optional(),
  cycleIndex: z.number().default(0),
});

export const regenerateProductImageFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => regenerateSchema.parse(d))
  .handler(async ({ data }) => {
    // Try to pick the next best matching photorealistic showcase image
    const chosenUrl = matchShowcaseImage(data.productName, data.category, data.cycleIndex);
    return {
      success: true,
      imageUrl: chosenUrl,
      source: "ai-showcase-photography",
      totalAvailable: SHOWCASE_PHOTOGRAPHY.length,
    };
  });
