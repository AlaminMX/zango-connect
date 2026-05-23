import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Footer } from "@/components/Footer";
import { SellerCard } from "@/components/SellerCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CITIES = ["All cities", "Kano", "Kaduna", "Abuja", "Other"];

export const Route = createFileRoute("/category/$slug")({ component: CategoryPage });

function CategoryPage() {
  const { slug } = Route.useParams();
  const [city, setCity] = useState("All cities");

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: sellers, isLoading } = useQuery({
    queryKey: ["sellers", category?.name, city],
    enabled: !!category,
    queryFn: async () => {
      let q = supabase
        .from("sellers")
        .select("id, slug, business_name, category, city, profile_photo_url, is_verified, rating")
        .eq("category", category!.name);
      if (city !== "All cities") q = q.eq("city", city);
      const { data, error } = await q.order("is_verified", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-5xl px-5 py-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Back</Link>
        <div className="mt-4 flex items-center gap-3">
          <div className="text-4xl">{category?.icon_emoji ?? "🛍️"}</div>
          <h1 className="font-serif text-3xl">{category?.name ?? "Category"}</h1>
        </div>

        <div className="mt-6">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-44 rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {sellers?.map((s) => <SellerCard key={s.id} {...s} />)}
          {sellers && sellers.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No sellers in this category yet.
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
