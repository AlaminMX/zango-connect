import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { humanizeError } from "@/lib/error-messages";

export const Route = createFileRoute("/auth")({ component: AuthPage });

// Public sign-up is gone — this is a sign-in-only page now. New vendor
// accounts are created inline as step 1 of /register (see that file's own
// header comment) or by an admin. "signup" is intentionally not a Mode
// anymore, not just hidden — removing it from the type means the compiler
// catches it if anything tries to route here in signup mode again.
type Mode = "signin" | "forgot" | "reset";

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const routeAfterLogin = async (userId: string) => {
    // OAuth consent (and any other same-origin) return URL: honor it above role-based routing.
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      window.location.href = next;
      return;
    }
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (role) { nav({ to: "/admin" }); return; }
    const { data: s } = await supabase.from("sellers").select("id, onboarding_status, verification_status").eq("user_id", userId).maybeSingle();
    
    if (s) {
      // Vendor found — check onboarding and approval status
      const status = s.onboarding_status;
      const verificationStatus = s.verification_status;
      
      if (status === "step1_complete" || status === "draft") {
        // Incomplete onboarding — resume from step 2
        nav({ to: "/register" });
      } else if (verificationStatus === "approved") {
        // Approved vendor — go to dashboard
        nav({ to: "/dashboard" });
      } else if (verificationStatus === "pending") {
        // Pending approval — show waiting screen
        nav({ to: "/vendor-approval-pending" });
      } else if (verificationStatus === "rejected") {
        // Rejected — show rejection notice
        nav({ to: "/vendor-rejected" });
      } else {
        // Default to dashboard for vendor
        nav({ to: "/dashboard" });
      }
    } else {
      // No vendor found — go to home (buyer or new vendor)
      nav({ to: "/" });
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // Check if this is a password recovery session
        if (data.session.user?.recovery_sent_at) {
          setMode("reset");
          return;
        }
        routeAfterLogin(data.session.user.id);
      }
    });

    // Listen for PASSWORD_RECOVERY event from magic link
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        nav({ to: "/reset-password" });
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signin") {
        // Race the actual sign-in against a 12-second timeout so the
        // button can never get permanently stuck in the loading state.
        const signInPromise = supabase.auth.signInWithPassword({ email, password });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Sign-in timed out. Please check your connection and try again.")), 12_000)
        );
        const { data, error } = await Promise.race([signInPromise, timeoutPromise]);
        if (error) {
          if (error.message.toLowerCase().includes("not confirmed")) {
            nav({ to: "/verify-email", search: { email } });
            return;
          }
          toast.error(error.message);
          return;
        }
        if (data.user) {
          if (!data.user.email_confirmed_at) {
            nav({ to: "/verify-email", search: { email } });
            return;
          }
          toast.success("Welcome back");
          await routeAfterLogin(data.user.id);
        }

      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) { toast.error(humanizeError(error.message)); return; }
        setResetSent(true);
        return;

      } else if (mode === "reset") {
        if (newPassword.length < 6) {
          toast.error("Password must be at least 6 characters.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) { toast.error(humanizeError(error.message)); return; }
        toast.success("Password updated! You're now signed in.");
        const { data } = await supabase.auth.getUser();
        if (data.user) await routeAfterLogin(data.user.id);
        return;
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password: success confirmation ────────────────────────────────
  if (mode === "forgot" && resetSent) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-md px-5 py-10">
          <BackButton fallback="/" />
          <div className="mt-6 rounded-2xl border bg-card p-6 shadow-warm text-center">
            <div className="mb-3 text-4xl">📬</div>
            <h1 className="font-serif text-2xl">Check your email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a password reset link to <strong>{email}</strong>. Click the link in
              the email to set a new password.
            </p>
            <button
              onClick={() => { setMode("signin"); setResetSent(false); }}
              className="mt-5 text-sm text-primary underline underline-offset-2"
            >
              Back to sign in
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Reset password screen (arrived via email link) ────────────────────────
  if (mode === "reset") {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-md px-5 py-10">
          <div className="mt-6">
            <h1 className="font-serif text-3xl">Set new password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a strong password for your account.</p>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-warm">
            <div>
              <Label htmlFor="new-pw">New password</Label>
              <PasswordInput
                id="new-pw"
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Saving…" : "Save new password"}
            </Button>
          </form>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Forgot password form ──────────────────────────────────────────────────
  if (mode === "forgot") {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-md px-5 py-10">
          <BackButton fallback="/auth" />
          <div className="mt-6">
            <h1 className="font-serif text-3xl">Reset password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
          </div>
          <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-warm">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {loading ? "Sending…" : "Send reset link"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="block w-full text-center text-sm text-muted-foreground hover:text-primary"
            >
              Back to sign in
            </button>
          </form>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Sign in (only mode left on this page) ─────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-md px-5 py-10">
        <BackButton fallback="/" />

        <div className="mt-6">
          <h1 className="font-serif text-3xl">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your store.</p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-warm">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pw">Password</Label>
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2"
              >
                Forgot password?
              </button>
            </div>
            <PasswordInput
              id="pw"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? "…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Just browsing? <Link to="/" className="text-primary underline">Go to marketplace</Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Want to sell? <Link to="/register" className="text-primary underline">Open your store →</Link>
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
