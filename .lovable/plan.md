
## Goal
Ship Part 1 only: fix the admin auth-on-refresh bug and the infinite-skeleton dashboard. Part 2 (redesign) comes next as 3 rendered directions you pick from.

## Root cause

Two separate bugs compound into "admin logged out + dashboard stuck":

1. **Auth race on refresh.** `admin.tsx` runs both `getSession()` and `onAuthStateChange` and gates rendering on a single `allowed` flag. On hard refresh, the Supabase client is lazily constructed (Proxy in `client.ts`) and the auth lock is bypassed, so `getSession()` resolves quickly — but the role check (`user_roles`) can still race with token rehydration. The 5s fallback then ships the user to `/auth` even though the session exists. Same pattern is duplicated in `dashboard.tsx`, `TopBar.tsx`, `SellerBottomNav.tsx` — each maintains its own auth state, none coordinate, and a `TOKEN_REFRESHED` mid-flight can flip one component before another.

2. **Single `Promise.all` loader.** `admin.tsx#loadAll()` runs 6 queries inside one `Promise.all` with no try/catch and no per-section state. If any one query hangs or errors (e.g. RLS denies one table for a millisecond while auth rehydrates), the whole `await` rejects, `loadAll` throws into the `useEffect`, `allowed` stays `true` but every section stays on its initial empty/skeleton state forever. There's also no abort signal — a stuck request never times out at the query level.

## Fix

### 1. Centralized `AuthProvider` (`src/lib/authContext.tsx` — new)
- One `useEffect` in the provider: `getSession()` → set initial state → subscribe to `onAuthStateChange`, filtering to `SIGNED_IN | SIGNED_OUT | TOKEN_REFRESHED | USER_UPDATED | INITIAL_SESSION`.
- Exposes `{ user, session, isReady, isAdmin, signOut }`. `isAdmin` derived from a single `user_roles` query keyed on `user.id`, cached in state, refreshed on auth changes only.
- `isReady = true` once **both** the initial `getSession()` resolves **and** the role lookup completes (or fails — failure sets `isAdmin=false`, never blocks).
- Hard 3s timeout on the role lookup → on timeout, `isReady=true`, `isAdmin=false`, log a diagnostic warning. No infinite wait.
- Wrap in `__root.tsx` inside `QueryClientProvider`.

### 2. Refactor consumers to use the provider
- `admin.tsx`: replace the bespoke auth `useEffect` with `useAuth()`. Render `<PageLoader>` while `!isReady`; redirect to `/auth` if ready & no user; redirect to `/` if ready & not admin.
- `dashboard.tsx`, `TopBar.tsx`, `SellerBottomNav.tsx`: replace their `getSession + onAuthStateChange` blocks with `useAuth()`. Removes 4 competing subscribers.
- `auth.tsx`: after sign-in, the provider's listener handles state; remove any duplicate listeners there.

### 3. Resilient admin data loading
Replace the single `Promise.all` in `loadAll()` with **per-section `useQuery` hooks** (TanStack Query is already installed):
- `sellersQuery`, `productsQuery`, `categoriesQuery`, `sectionsQuery`, `vouchesQuery`, `statsQuery` — each independent, each with `retry: 1`, `staleTime: 30_000`, and `AbortSignal.timeout(8000)` on the Supabase call.
- Each section renders one of: skeleton (loading), real data, or an inline "Couldn't load — Retry" error card (never infinite skeleton).
- Mutations (approve/reject/block/etc.) call `queryClient.invalidateQueries({ queryKey: [...] })` on success — removes the manual `setSellers(prev => ...)` patching, which is also a source of stale state.
- Queries `enabled: isReady && isAdmin` so they never fire before auth resolves.

### 4. Diagnostic logging
- `console.debug("[auth]", event, !!session)` inside the provider listener.
- `console.warn("[admin] section failed:", key, error)` in each query's `onError`.
- Kept behind `import.meta.env.DEV` so production stays quiet.

### 5. Database
No schema changes needed. RLS, `user_roles`, and `has_role()` already correct (per memory). All fixes are client-side.

## Files changed
- **New**: `src/lib/authContext.tsx`
- **Edited**: `src/routes/__root.tsx` (wrap with `AuthProvider`)
- **Edited**: `src/routes/admin.tsx` (use `useAuth`, split loader into `useQuery` per section, per-section error UI)
- **Edited**: `src/routes/dashboard.tsx` (use `useAuth`)
- **Edited**: `src/components/TopBar.tsx` (use `useAuth`)
- **Edited**: `src/components/SellerBottomNav.tsx` (use `useAuth`)

No other routes touched. No DB migration.

## Verification
- Sign in as admin → hard refresh → admin page renders, no redirect to `/auth`.
- Throttle network in DevTools → each section either loads or shows "Retry", never infinite skeleton.
- Sign out → all four consumers update in lockstep (one subscriber, one source of truth).
- Close + reopen browser → session persists (no change to `client.ts` storage config).

## Part 2 (next round, not in this plan)
Once auth ships and you confirm it on a real refresh, I'll capture the current home page, generate 3 rendered design directions inspired by the uploaded Northern Marketplace UX vision (palette/type/composition variants), and you pick one to build out across home → listings → PDP → seller storefront → admin.
