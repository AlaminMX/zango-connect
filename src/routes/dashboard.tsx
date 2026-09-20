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
    if (!user) {
      nav({ to: "/auth", replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data: s } = await supabase
          .from("sellers")
          .select("slug, verification_status, onboarding_status, profile_photo_url")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (!s) {
          nav({ to: "/register", replace: true });
          return;
        }

        if (s.verification_status === "approved") {
          nav({
            to: "/store/$slug",
            params: { slug: s.slug },
            replace: true,
          });
        } else if (s.verification_status === "rejected") {
          nav({ to: "/vendor-rejected", replace: true });
        } else if (
          s.onboarding_status === "step1_complete" ||
          s.onboarding_status === "draft" ||
          !s.profile_photo_url
        ) {
          nav({ to: "/register", replace: true });
        } else {
          nav({ to: "/vendor-approval-pending", replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[dashboard] seller lookup failed:", err);
        nav({ to: "/", replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, user, nav]);

  return <PageLoader label="Loading your store…" />;
}
