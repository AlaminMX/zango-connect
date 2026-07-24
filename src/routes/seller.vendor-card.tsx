import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { BackButton } from "@/components/BackButton";
import { Footer } from "@/components/Footer";
import { PageLoader } from "@/components/LoadingSpinner";
import { TopBar } from "@/components/TopBar";
import { VendorCardStudio } from "@/components/vendor-card/VendorCardStudio";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { useSellerProfile } from "@/lib/sellerProfile";
import type { VendorCardProduct } from "@/lib/vendor-card/types";

export const Route = createFileRoute("/seller/vendor-card")({ component: SellerVendorCardPage });

function SellerVendorCardPage() {
  const nav = useNavigate();
  const { user, isReady } = useAuth();
  const { seller, loading: sellerLoading } = useSellerProfile();

  useEffect(() => {
    if (!isReady) return;
    if (!user) nav({ to: "/auth", replace: true });
    else if (!sellerLoading && !seller) nav({ to: "/register", replace: true });
  }, [isReady, user, sellerLoading, seller, nav]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["vendor-card-products", seller?.id],
    enabled: !!seller?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, image_urls, status, created_at")
        .eq("seller_id", seller!.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8)
        .abortSignal(AbortSignal.timeout(8000));
      if (error) throw error;
      return (data ?? []) as VendorCardProduct[];
    },
  });

  if (!isReady || sellerLoading || isLoading) return <PageLoader label="Preparing your vendor card…" />;
  if (!seller) return null;

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-6xl px-5 py-6">
        <BackButton fallback={`/store/${seller.slug}`} />
        <div className="mt-5">
          <VendorCardStudio vendor={seller} products={products ?? []} canRegenerate />
        </div>
      </main>
      <Footer />
    </div>
  );
}
