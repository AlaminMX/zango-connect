import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search_products";
import listMyBookmarks from "./tools/list_my_bookmarks";
import getMySellerProfile from "./tools/get_my_seller_profile";
import listMyProducts from "./tools/list_my_products";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "zango-mcp",
  title: "ZANGO",
  version: "0.1.0",
  instructions:
    "ZANGO is a WhatsApp-first marketplace for northern Nigeria. Use `search_products` to discover listings across ZANGO, and the `list_my_*` / `get_my_seller_profile` tools to work with the signed-in user's own bookmarks, seller profile, and product inventory.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, listMyBookmarks, getMySellerProfile, listMyProducts],
});
