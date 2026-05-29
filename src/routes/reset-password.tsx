import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const nav = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we already have a recovery session or wait for PASSWORD_RECOVERY event
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setReady(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setSuccess(true);
    toast.success("Password updated successfully!");

    // Auto-redirect after 3s
    setTimeout(() => {
      nav({ to: "/auth" });
    }, 3000);
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-md px-5 py-20 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-semibold">Password updated!</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your password has been changed successfully. Redirecting you to sign in…
          </p>
          <button
            onClick={() => nav({ to: "/auth" })}
            className="mt-6 text-sm text-primary underline underline-offset-2 hover:opacity-80"
          >
            Go to sign in now
          </button>
        </div>
      </div>
    );
  }

  // ── Invalid / expired link ────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="mx-auto max-w-md px-5 py-20 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <svg className="h-10 w-10 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-semibold">Invalid reset link</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <button
            onClick={() => nav({ to: "/auth" })}
            className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  // ── Reset form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto max-w-md px-5 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-semibold">Set new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a strong password for your Sutura Market account.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border bg-card p-7 shadow-warm"
        >
          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <PasswordInput
              id="new-pw"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">Confirm new password</Label>
            <PasswordInput
              id="confirm-pw"
              required
              minLength={6}
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Passwords do not match</p>
            )}
            {confirmPassword && newPassword === confirmPassword && confirmPassword.length >= 6 && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Passwords match
              </p>
            )}
          </div>

          {/* Strength hint */}
          <div className="rounded-xl bg-muted/60 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Password strength</p>
            <div className="flex gap-1.5">
              {[6, 8, 10, 12].map((threshold, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    newPassword.length >= threshold
                      ? i < 1 ? "bg-destructive" : i < 2 ? "bg-amber-400" : i < 3 ? "bg-yellow-400" : "bg-green-500"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {newPassword.length === 0 ? "Enter a password" :
               newPassword.length < 6 ? "Too short" :
               newPassword.length < 8 ? "Weak" :
               newPassword.length < 10 ? "Fair" :
               newPassword.length < 12 ? "Good" : "Strong"}
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading || !newPassword || newPassword !== confirmPassword}
            className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 h-11 text-sm font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Updating password…
              </span>
            ) : "Update password"}
          </Button>

          <button
            type="button"
            onClick={() => nav({ to: "/auth" })}
            className="block w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
}
