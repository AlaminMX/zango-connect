
# Sutura Market — UX & Navigation Fixes

## 1. Fix "Open Your Store" → Registration trap

Root cause: `src/routes/register.tsx` runs `supabase.auth.getUser()` on mount and redirects to `/auth` when there is no session. That's the split-second flash the user sees.

Fix:
- Inline auth into the registration form itself. Step 1 collects: business name, your name, WhatsApp, city, category, bio, **plus email + password**. Submitting Step 1 calls `supabase.auth.signUp` (or `signInWithPassword` if the email already exists), then immediately inserts the `sellers` row. No external `/auth` round-trip.
- If the user is *already* signed in (returning seller continuing onboarding), skip the email/password fields.
- Remove the `nav({ to: "/auth" })` redirect on mount entirely. The page is reachable by everyone.
- `BackButton` already falls back to `/`. Confirm `Open Your Store` CTA uses a real `<Link to="/register">` (not a programmatic redirect through `/auth`) — audit `src/routes/index.tsx`, hero CTAs, and any other entry points.
- Mobile back behaves correctly once we stop doing `nav({ replace: true })` style redirects on mount.

## 2. Hide the auth UI (MVP)

Keep Supabase auth working under the hood (sellers still need an account to manage their store; admin still needs to sign in to `/admin`), but remove all *visible* auth surfaces from the public app:

- Delete `Sign in` button from `src/components/TopBar.tsx`.
- Remove the "Admin" pill from TopBar (admin keeps direct-URL access at `/admin`).
- Stop linking to `/auth` from `ProductCard` wishlist prompt, from `register.tsx`, from any "already have an account?" copy.
- Leave route files `auth.tsx`, `verify-email.tsx`, `verified.tsx`, `reset-password.tsx` in place (admin uses them) but unlinked from the public UI.
- Remove the legacy-wishlist `onAuthStateChange` migration from `__root.tsx` since wishlist moves back to localStorage (see §4). Keep the import-free root clean.

No real route guards are added or removed — `/register` simply stops redirecting, and `/dashboard` still routes authenticated sellers to their store page (unchanged behavior for returning sellers who land there via a saved link).

## 3. Replace Sign in button with Cart/Wishlist icon

In `src/components/TopBar.tsx`:
- Replace the right-hand `Sign in` pill with a `<Link to="/wishlist">` icon button (lucide `Heart` or `ShoppingBag`).
- Show a small count badge when localStorage wishlist is non-empty.
- Same 44×44 tap target as `BackButton`, visible on every page.

## 4. localStorage wishlist (no account required)

Rewrite `src/components/ProductCard.tsx` wishlist logic:
- Drop Supabase `wishlists` reads/writes from the card.
- Single source of truth: `localStorage["sutura_wishlist"]` storing an array of `{ id, name, price, image_url, seller_id, seller_name, seller_city, seller_slug, whatsapp_number, stock_status, savedAt }`. Saving the full product snapshot means the wishlist page works offline and survives products being later edited.
- Export `useWishlist()` hook (subscribes via `storage` event + an in-module pub/sub) so TopBar badge and ProductCard heart stay in sync across tabs.
- Heart toggles instantly, no toast prompting sign-in.

## 5. /wishlist page (acts as the cart)

Rewrite `src/routes/wishlist.tsx`:
- Read items from the localStorage hook.
- Empty state: friendly illustration/copy + CTA back to `/`.
- Grid of `ProductCard`s rendered from the stored snapshots, so each item shows image, name, price, seller name, city, and the existing WhatsApp Order button (uses `buildWhatsAppUrl` + `trackClick` already in `whatsapp.ts`).
- No checkout, no payment, no auth.

Also update `src/routes/account.tsx` so the Wishlist tab reads from localStorage (or simply redirect `/account` → `/wishlist` since account is auth-gated and unused in MVP).

## 6. Homepage loading performance

`src/routes/index.tsx`:
- Remove the `useEffect` + `onAuthStateChange` wishlist-count fetch (now derived from localStorage synchronously — no network).
- Keep the existing `useQuery` calls but ensure they all run in parallel (they already do; no awaits in series).
- Render skeletons for **every** section that has `isLoading` state so the page height is reserved from first paint: Categories, Featured Sellers, Featured Products, Explore Cities. `ProductSkeleton`, `CategorySkeleton`, `SellerSkeleton` already exist — wire them where they're missing.
- Add explicit `width`/`height` (or aspect-ratio classes) to hero `<img>` and category card images to prevent CLS.
- Add `loading="lazy"` + `decoding="async"` to below-the-fold imagery (`ProductCard` already has `loading="lazy"`; verify `SellerCard`, `ExploreCities`).
- Preload the hero image via the route `head().links` (`rel="preload" as="image"`).

## 7. Mobile UX polish

- TopBar Sign-in → Wishlist icon (§3) gives a clear, predictable right-hand action everywhere.
- Confirm all back buttons use `BackButton` with `fallback="/"` so no dead ends.
- Keep tap targets ≥ 44×44 (BackButton, wishlist icon, WhatsApp button already comply).
- Audit `SellerBottomNav` to ensure it doesn't render any auth-gated links for guests.

## 8. Validation checklist (manual QA after build)

- Home → "Open Your Store" → Register page loads immediately, no flash, no `/auth` redirect.
- Back button on Register returns to Home; mobile system back returns to Home.
- TopBar shows wishlist icon with badge; tapping opens `/wishlist`.
- Save/unsave a product from a guest session; refresh; item persists.
- `/wishlist` lists saved items with working WhatsApp button; empty state renders when cleared.
- Homepage shows skeletons for all sections, no layout shift, hero image stable.
- No visible Sign in / Sign up links anywhere in the public UI.

## Technical notes

- No database migrations. No RLS changes. No backend code touched (per "fix UX & navigation" scope).
- Files edited: `src/routes/register.tsx`, `src/routes/index.tsx`, `src/routes/wishlist.tsx`, `src/routes/account.tsx`, `src/routes/__root.tsx`, `src/components/TopBar.tsx`, `src/components/ProductCard.tsx`, `src/components/SellerBottomNav.tsx` (audit only).
- New file: `src/lib/wishlist.ts` (localStorage hook + helpers).
- Auth routes (`auth.tsx`, `verify-email.tsx`, etc.) are left on disk but unlinked — admin can still reach them directly. Confirm this is acceptable; if you want them physically deleted, I'll remove them and re-point admin onboarding (rare flow) to a hidden URL.

