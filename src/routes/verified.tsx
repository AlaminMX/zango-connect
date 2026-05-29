import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/verified")({ component: VerifiedPage });

function VerifiedPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"loading" | "ready" | "no-session">("loading");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    // Supabase parses the hash automatically; give it a beat then read session.
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        setUserId(data.session.user.id);
        setStatus("ready");
      } else {
        setStatus("no-session");
      }
    }, 400);
    return () => { mounted = false; clearTimeout(t); };
  }, []);

  const handleContinue = async () => {
    if (!userId) { nav({ to: "/auth" }); return; }
    const { data: s } = await supabase.from("sellers").select("id").eq("user_id", userId).maybeSingle();
    nav({ to: s ? "/dashboard" : "/register" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-secondary/40 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <Link to="/" className="mb-10 flex items-center gap-2">
          <span className="font-serif text-2xl font-semibold tracking-tight text-primary">Sutura</span>
          <span className="font-serif text-2xl text-foreground/80">Market</span>
        </Link>

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary shadow-warm-lg">
          {status === "loading" ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : (
            <CheckCircle2 className="h-12 w-12" />
          )}
        </div>

        {status === "loading" && (
          <>
            <h1 className="font-serif text-3xl">Verifying your email…</h1>
            <p className="mt-2 text-sm text-muted-foreground">Just a moment.</p>
          </>
        )}

        {status === "ready" && (
          <>
            <h1 className="font-serif text-3xl">Welcome to Sutura Market 🎉</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your email has been verified successfully. You're all set to start exploring the kasuwa.
            </p>
            <Button
              onClick={handleContinue}
              className="mt-8 h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground shadow-warm-lg hover:bg-primary/90"
            >
              Continue to Sutura Market
            </Button>
          </>
        )}

        {status === "no-session" && (
          <>
            <h1 className="font-serif text-3xl">Email verified</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Sign in to continue setting up your store.
            </p>
            <Button
              onClick={() => nav({ to: "/auth" })}
              className="mt-8 h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground shadow-warm-lg hover:bg-primary/90"
            >
              Go to sign in
            </Button>
          </>
        )}

        <Link to="/" className="mt-4 text-sm text-muted-foreground underline hover:text-primary">
          Browse the marketplace
        </Link>
      </div>
    </div>
  );
}
