import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_products",
  title: "Search products",
  description:
    "Search active ZANGO product listings by keyword. Returns up to 20 products with name, price (NGN), category, seller store name and slug, and city.",
  inputSchema: {
    query: z.string().trim().min(1).max(200).describe("Keyword to match against product name and description."),
    city: z.string().trim().max(80).optional().describe("Optional city name filter, e.g. 'Kano'."),
    limit: z.number().int().min(1).max(20).default(10),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, city, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("products")
      .select("id, name, description, price, category, image_url, sellers:seller_id(business_name, slug, city)")
      .eq("status", "active")
      .ilike("name", `%${query}%`)
      .limit(limit);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).filter((r: any) => !city || r.sellers?.city?.toLowerCase() === city.toLowerCase());
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { products: rows },
    };
  },
});
