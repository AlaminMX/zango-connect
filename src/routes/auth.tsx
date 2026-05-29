import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

type Mode = "signin" | "signup" | "forgot" | "reset";

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const routeAfterLogin = async (userId: string) => {
    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (role) { nav({ to: "/admin" }); return; }
    const { data: s } = await supabase.from("sellers").select("id").eq("user_id", userId).maybeSingle();
    nav({ to: s ? "/dashboard" : "/register" });
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
        setMode("reset");
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/verified` },
      });
      if (error) { toast.error(error.message); setLoading(false); return; }
      if (data.user && !data.session) {
        setLoading(false);
        nav({ to: "/verify-email", search: { email } });
        return;
      }
      if (data.user) await routeAfterLogin(data.user.id);

    } else if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("not confirmed")) {
          setLoading(false);
          nav({ to: "/verify-email", search: { email } });
          return;
        }
        toast.error(error.message);
      } else if (data.user) {
        if (!data.user.email_confirmed_at) {
          setLoading(false);
          nav({ to: "/verify-email", search: { email } });
          return;
        }
        toast.success("Welcome back");
        await routeAfterLogin(data.user.id);
      }

    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      setResetSent(true);
      return;

    } else if (mode === "reset") {
      if (newPassword.length < 6) {
        toast.error("Password must be at least 6 characters.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Password updated! You're now signed in.");
      const { data } = await supabase.auth.getUser();
      if (data.user) await routeAfterLogin(data.user.id);
      return;
    }

    setLoading(false);
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
      </div>
    );
  }

  // ── Sign in / Sign up ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-md px-5 py-10">
        <BackButton fallback="/" />
        <div className="mt-6">
          <h1 className="font-serif text-3xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to manage your store." : "Start your store in minutes."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-warm">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pw">Password</Label>
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <PasswordInput id="pw" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="block w-full text-center text-sm text-muted-foreground hover:text-primary"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Just browsing? <Link to="/" className="text-primary underline">Go to marketplace</Link>
        </p>
      </div>
    </div>
  );
}
