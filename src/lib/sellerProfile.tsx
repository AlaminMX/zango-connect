/**
 * useSellerProfile — single shared query for the current user's seller row.
 * Replaces per-component supabase calls that caused auth races in nav + dashboard.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";

export interface SellerProfile {
  id: string;
  slug: string;
  business_name: string;
  verification_status: "pending" | "approved" | "rejected" | string;
  is_verified: boolean;
  is_blocked: boolean;
  city: string;
  category: string;
  whatsapp_number: string;
  profile_photo_url: string | null;
  cover_photo_url: string | null;
  bio: string | null;
}

interface Ctx {
  seller: SellerProfile | null;
  loading: boolean;
  refresh: () => void;
}

const SellerCtx = createContext<Ctx>({ seller: null, loading: true, refresh: () => {} });

export function SellerProfileProvider({ children }: { children: ReactNode }) {
  const { user, isReady } = useAuth();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isReady) return;
    if (!user) { setSeller(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("sellers")
          .select("id, slug, business_name, verification_status, is_verified, is_blocked, city, category, whatsapp_number, profile_photo_url, cover_photo_url, bio")
          .eq("user_id", user.id)
          .maybeSingle()
          .abortSignal(AbortSignal.timeout(8000));
        if (cancelled) return;
        setSeller((data as SellerProfile) ?? null);
      } catch (err) {
        if (cancelled) return;
        console.warn("[sellerProfile] lookup failed:", err);
        setSeller(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isReady, user, tick]);

  return (
    <SellerCtx.Provider value={{ seller, loading, refresh: () => setTick((t) => t + 1) }}>
      {children}
    </SellerCtx.Provider>
  );
}

export function useSellerProfile() { return useContext(SellerCtx); }
