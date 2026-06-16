/**
 * Centralized auth state. Single source of truth for session + admin role.
 *
 * Replaces the per-component `getSession()` + `onAuthStateChange` pattern
 * (which caused race conditions on refresh and duplicate subscribers).
 *
 * Exposes:
 *   - user / session   : current Supabase auth state
 *   - isReady          : true once initial session check AND role lookup resolve
 *                        (or time out — never blocks indefinitely)
 *   - isAdmin          : derived from user_roles
 *   - signOut()        : clears session
 */
import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState {
  user: User | null;
  session: Session | null;
  isReady: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const DEV = import.meta.env.DEV;
const log = (...args: unknown[]) => { if (DEV) console.debug("[auth]", ...args); };

// Hard timeout on the role lookup so isReady can never hang
const ROLE_TIMEOUT_MS = 3000;

async function fetchIsAdmin(userId: string): Promise<boolean> {
  try {
    const query = supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const timeout = new Promise<{ data: null }>((resolve) =>
      setTimeout(() => {
        if (DEV) console.warn("[auth] role lookup timed out — defaulting isAdmin=false");
        resolve({ data: null });
      }, ROLE_TIMEOUT_MS),
    );
    const { data } = await Promise.race([query, timeout]);
    return !!data;
  } catch (err) {
    if (DEV) console.warn("[auth] role lookup failed:", err);
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Track the last user id we resolved a role for, to avoid redundant lookups
  // on TOKEN_REFRESHED / INITIAL_SESSION which fire for the same user.
  const lastRoleUserId = useRef<string | null>(null);

  const applySession = useCallback(async (s: Session | null) => {
    setSession(s);
    setUser(s?.user ?? null);
    const uid = s?.user?.id ?? null;
    if (uid && uid !== lastRoleUserId.current) {
      lastRoleUserId.current = uid;
      const admin = await fetchIsAdmin(uid);
      setIsAdmin(admin);
    } else if (!uid) {
      lastRoleUserId.current = null;
      setIsAdmin(false);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // 1. Read initial session from localStorage
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      log("getSession resolved", !!data.session);
      void applySession(data.session);
    }).catch((err) => {
      if (cancelled) return;
      console.error("[auth] getSession failed:", err);
      setIsReady(true); // never block forever
    });

    // 2. Subscribe to subsequent auth events
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      log("event:", event, "session?", !!s);
      // Only react to identity transitions. INITIAL_SESSION is handled by getSession() above.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void applySession(s);
      }
    });

    // 3. Safety net: never let isReady stay false longer than 5s.
    const safetyId = setTimeout(() => {
      if (cancelled) return;
      setIsReady((prev) => {
        if (!prev && DEV) console.warn("[auth] safety timeout fired — forcing isReady=true");
        return true;
      });
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(safetyId);
      listener.subscription.unsubscribe();
    };
  }, [applySession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isReady, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
