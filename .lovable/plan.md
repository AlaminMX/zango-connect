# Launch Gate + Share-Card Removal

## Part 1 — Launch Gate

### 1. `src/lib/launchGate.ts` (new)
Single source of truth:
- `MARKETPLACE_OPEN = false`
- `LAUNCH_DATE` ISO constant (used by countdown)
- `PRELAUNCH_ALLOWLIST: string[]` — Supabase user IDs, seeded with `"REPLACE_WITH_ADMIN_USER_ID"` / `"REPLACE_WITH_NEXEL_USER_ID"` placeholders
- `canBypassLaunchGate(userId, isAdmin)` → true if `MARKETPLACE_OPEN`, `isAdmin`, or `userId ∈ PRELAUNCH_ALLOWLIST`

### 2. Route guard (client-side, blocking)
Two coordinated pieces in `launchGate.ts`, both reading from the existing `useAuth()` / `authContext` (already tracks session + admin role via `has_role`), so no new backend plumbing:

**a. `assertLaunchGate` — `beforeLoad` hook**
- Reads auth from router context (we'll thread `{ auth }` into router context in `router.tsx` + `__root.tsx`, matching TanStack's documented pattern)
- If auth is not yet ready (first hard refresh, session still hydrating), returns without redirecting — the pending gate below handles that frame
- If ready and `canBypassLaunchGate(user?.id, isAdmin) === false` → `throw redirect({ to: "/coming-soon" })`
- In-app navigation: `beforeLoad` runs before the component mounts, so gated routes never paint

**b. `LaunchGatePending` — blocking hydration shim**
- Wrapper used inside each gated route's `component` (or once at the root via a `pendingComponent`-style boundary) that renders a neutral full-screen skeleton while `isReady === false`
- Prevents any gated content from painting during the split-second between initial HTML and session rehydration on hard refresh
- Once `isReady` flips true, either the content renders (bypass allowed) or `assertLaunchGate` has already redirected

This is stronger than `admin.tsx`'s current post-mount `useEffect` check — no flash on client nav, no flash on refresh. Caveat (per your note): not airtight against JS-disabled scraping of the initial SSR HTML frame; that's acceptable for a launch gate.

**Gated routes** (add `beforeLoad: assertLaunchGate` + wrap component in `LaunchGatePending`):
`index.tsx`, `products.tsx`, `category.$slug.tsx`, `product.$id.tsx`, `store.$slug.tsx`, `sellers.tsx`, `search.tsx`, `explore.tsx`, `cities.tsx`, `city.$slug.tsx`, `wishlist.tsx`

**Explicitly untouched:** `dashboard.tsx`, `seller.products.tsx`, `account.tsx`, `auth.tsx`, `register.tsx`, `reset-password.tsx`, `verify-email.tsx`, `verified.tsx`, `vendor-approval-pending.tsx`, `vendor-rejected.tsx`, `admin.tsx`, `coming-soon.tsx`.

### 3. `src/routes/coming-soon.tsx` (new)
- Heading: "The Market Gates Are Almost Open" (DM Serif Display)
- Body copy verbatim from spec (Fira Sans)
- Countdown timer reading `LAUNCH_DATE` from `launchGate.ts` (days / hours / minutes / seconds, updates every 1s)
- Two CTAs: "Go to Dashboard" → `/dashboard`, "Upload Products" → `/seller/products`
- Warm Northern-inspired gradient built from existing terracotta/sage tokens (no new palette), subtle radial glow / soft pattern for texture
- Fully responsive, mobile-first — mirrors `TopBar`/`BottomNav` spacing conventions
- No auth wall; guests land here too. No 401/403 framing — it's an invitation, not an error page

### 4. Nav polish (UI only — real enforcement is Part 2)
`BottomNav.tsx` and `NavSidebar.tsx`: when `canBypassLaunchGate(user?.id, isAdmin)` is false, hide links to marketplace/search/categories/explore/sellers/wishlist. Dashboard/account/profile stay. Reads from `useAuth()`.

### 5. Post-launch behavior
Flip `MARKETPLACE_OPEN = true`. `assertLaunchGate` short-circuits to allow, `LaunchGatePending` becomes a no-op, nav links reappear. `PRELAUNCH_ALLOWLIST` + `canBypassLaunchGate` stay in tree, dormant, ready for future private-beta or maintenance-window reuse.

## Part 2 — Remove share-card feature

Delete:
- `src/components/vendor-card/` (entire folder)
- `src/components/VendorShareCardDialog.tsx`
- `src/components/ShareCardDialog.tsx`

Edit `src/routes/store.$slug.tsx`: drop `VendorShareCardDialog` import, `shareCardOpen` state, "Generate Share Card" button, dialog render.

Edit `src/routes/admin.tsx`: drop `ShareCardDialog` import + render + any state/handlers only used by it.

Grep repo for `vendor-card`, `VendorShareCardDialog`, `ShareCardDialog` and remove leftover imports / props.

## Notes
- Admins bypass automatically via `has_role`, so `PRELAUNCH_ALLOWLIST` only matters for non-admin bypass users. Send Nexel's UUID when ready and I'll drop it in — placeholders ship in the meantime.
