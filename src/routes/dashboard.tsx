import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/authContext";
import { PageLoader } from "@/components/LoadingSpinner";

export const Route = createFileRoute("/dashboard")({ component: Dashboard });

function Dashboard() {
  const nav = useNavigate();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (!user) { nav({ to: "/auth", replace: true }); return; }

    let cancelled = false;
    (async () => {
      try {
        const { data: s } = await supabase
          .from("sellers").select("slug").eq("user_id", user.id).maybeSingle();
        if (cancelled) return;
        nav({
          to: s ? "/store/$slug" : "/register",
          params: s ? { slug: s.slug } : undefined,
          replace: true,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[dashboard] seller lookup failed:", err);
        nav({ to: "/", replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [isReady, user, nav]);

  return <PageLoader label="Loading your store…" />;
}
