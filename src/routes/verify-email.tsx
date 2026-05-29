import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
});

function VerifyEmailPage() {
  const nav = useNavigate();
  const { email } = Route.useSearch();
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    if (!email) { toast.error("Email address missing — please sign in again."); return; }
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/verified` },
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Verification email sent. Check your inbox.");
  };

  const backToLogin = async () => {
    await supabase.auth.signOut();
    nav({ to: "/auth" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-secondary/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
        <Link to="/" className="mb-10 flex items-center gap-2">
          <span className="font-serif text-2xl font-semibold tracking-tight text-primary">Sutura</span>
          <span className="font-serif text-2xl text-foreground/80">Market</span>
        </Link>

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-primary shadow-warm-lg">
          <MailCheck className="h-10 w-10" />
        </div>

        <h1 className="font-serif text-3xl">Confirm your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          We sent a verification link to {email ? <span className="font-medium text-foreground">{email}</span> : "your inbox"}.
          Open it to activate your account and start trading on Sutura Market.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Didn't see it? Check your spam folder, or resend below.
        </p>

        <Button
          onClick={resend}
          disabled={busy}
          className="mt-8 h-12 w-full rounded-full bg-primary text-base font-medium text-primary-foreground shadow-warm-lg hover:bg-primary/90"
        >
          {busy ? "Sending…" : "Resend verification email"}
        </Button>
        <Button
          onClick={backToLogin}
          variant="outline"
          className="mt-3 h-12 w-full rounded-full text-base"
        >
          Back to login
        </Button>
      </div>
    </div>
  );
}
