import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_products",
  title: "List my products",
  description: "List products owned by the signed-in ZANGO seller (any status). Empty for buyers or sellers with no listings.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: seller } = await supabase.from("sellers").select("id").eq("user_id", ctx.getUserId()!).maybeSingle();
    if (!seller) return { content: [{ type: "text", text: "You do not have a seller profile." }] };
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, category, image_url, status, created_at, price_updated_at")
      .eq("seller_id", seller.id)
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { products: data ?? [] },
    };
  },
});
