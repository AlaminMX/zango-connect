/**
 * TopBar.tsx
 * Simplified header — logo only.
 * Search has moved to the homepage hero.
 * Navigation has moved to SellerBottomNav (for sellers).
 * A subtle "Sign in" text link appears for unauthenticated users.
 */

import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function TopBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setIsLoggedIn(!!data.session);
      if (data.session) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!role);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        const { data: role } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!role);
      } else {
        setIsAdmin(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img
            src="/sutura-logo.png"
            alt="Sutura Market"
            className="h-20 w-20 object-contain"
          />
          <div className="flex flex-col leading-none">
            <span
              className="font-serif text-lg font-bold tracking-wide text-primary"
              style={{ letterSpacing: "0.08em" }}
            >
              SUTURA
            </span>
            <span
              className="font-serif text-sm font-semibold tracking-widest text-foreground/70"
              style={{ letterSpacing: "0.15em" }}
            >
              MARKET
            </span>
          </div>
        </Link>

        {/* Right side — minimal */}
        <div className="flex items-center gap-2 text-sm">
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-primary transition"
            >
              Admin
            </Link>
          )}
          {!isLoggedIn && (
            <Link
              to="/auth"
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
      <div className="border-shift h-px w-full opacity-40" />
    </header>
  );
}
