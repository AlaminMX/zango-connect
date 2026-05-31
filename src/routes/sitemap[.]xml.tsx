/**
 * sitemap.xml — enumerates public routes and every active city marketplace.
 */
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const staticRoutes = ["/", "/sellers", "/products", "/register"];

        const { data: cities } = await supabaseAdmin
          .from("cities_of_business").select("slug, updated_at").eq("is_active", true);
        const { data: cats } = await supabaseAdmin.from("categories").select("slug");
        const { data: sellers } = await supabaseAdmin
          .from("sellers").select("slug")
          .eq("status", "active").eq("verification_status", "approved").limit(5000);

        const urls: string[] = [];
        for (const p of staticRoutes) urls.push(`<url><loc>${origin}${p}</loc></url>`);
        for (const c of cities ?? []) urls.push(`<url><loc>${origin}/city/${c.slug}</loc><lastmod>${(c.updated_at ?? new Date().toISOString()).slice(0,10)}</lastmod></url>`);
        for (const c of cats ?? []) urls.push(`<url><loc>${origin}/category/${c.slug}</loc></url>`);
        for (const s of sellers ?? []) urls.push(`<url><loc>${origin}/store/${s.slug}</loc></url>`);

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
        return new Response(xml, { headers: { "Content-Type": "application/xml" } });
      },
    },
  },
});
