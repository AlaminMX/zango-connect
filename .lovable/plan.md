# ZANGO Rebrand + 7 Targeted Fixes + Footer/BottomNav Spacing

## Scope

Apply the exact edits specified across 10 files, plus run 2 SQL migrations in the backend. No changes outside the listed files.

## Files to edit

1. `**index.html**` — `<title>` → `ZANGO — Kasuwancin Arewa`
2. `**src/components/TopBar.tsx**` — logo alt + "Sutura" span → ZANGO
3. `**src/components/Footer.tsx**` — brand + tagline → ZANGO; `pb-20` → `pb-8`
4. `**src/components/WelcomeModal.tsx**` — logo alt + welcome heading → ZANGO
5. `**src/components/BottomNav.tsx**` — all three `h-20` spacers → `h-16`
6. `**src/routes/index.tsx**` — brand strings → ZANGO; add `heroSection`, `trendingSection`, `exploreCitiesSection`, `openStoreSection` via `useSection`; Replace hardcoded heading text in each homepage section as follows:
  - Hero heading → {heroSection?.title ?? "Fara Kasuwanci"}
  - Hero Hausa subtitle → {heroSection?.subtitle ?? "Kasuwancin Arewa"}
  - Trending Sellers section heading → {trendingSection?.title ?? "Trending Sellers"}
  - Explore Cities heading → {exploreCitiesSection?.title ?? "Explore by City"}
  - Explore Cities subtitle → {exploreCitiesSection?.subtitle ?? "Bincike ta Birni"}
  - Open Your Store CTA heading → {openStoreSection?.title ?? "Open Your Store on ZANGO"}
  - Open Your Store CTA subtitle → {openStoreSection?.subtitle ?? "Bude Shagon ka"}
7. `**src/routes/store.$slug.tsx**` — meta strings → ZANGO; drop `authReady` from render gate (`if (isLoading) return …`); add public-access comment block above useState
8. `**src/routes/register.tsx**` — subtitle → `Kasuwancin Arewa — Join ZANGO`; add `availableCities` state; load `cities_of_business` in mount effect; add effect matching `city` → `city_id`; remove tiny top-right Sign-in link; add prominent sign-in card above step pills (step 1 only)
9. `**src/routes/wishlist.tsx**` — remove `total` variable; replace total-value card with lightweight `{n} items saved` + preserved Order-all button
10. `**src/routes/admin.tsx**`
  - `loadSellers`: filter `.in("onboarding_status", ["step1_complete","step2_complete"])`; add `city_id` to SELECT
    - `SellerRow` interface: add optional `city_id`
    - `SellerRow` component: add `cities` + `onAssignCity` props; render MapPin + city `<select>` under category·city line
    - New `assignSellerCity` handler in `AdminPage`; wire `cities` + `onAssignCity` to every `<SellerRow>`
    - `saveCity`: switch INSERT to `.select("id").single()`; after successful create of new city, bulk-update sellers matching name (case-insensitive) with null `city_id` and toast the count
    - Homepage section editor dialog: description block keyed by section (hero/featured_products/trending_sellers/explore_cities/open_store); relabel Title → English Title, Subtitle → Hausa Subtitle / Tagline (with hint), Body → Description; amber notice card at bottom of Homepage tab listing required section keys

## SQL migrations (via supabase--migration)

1. Public RLS: `CREATE POLICY "public_read_approved_sellers" ON sellers FOR SELECT TO anon USING (verification_status = 'approved' AND is_blocked = false);` — plus verify `anon` has `GRANT SELECT` on `sellers` (add if missing). Check `products` for equivalent anon read policy and add if absent (approved+non-blocked seller, active status).
2. Seed `homepage_sections` with keys `hero`, `trending_sellers`, `featured_products`, `explore_cities`, `open_store` via `INSERT … ON CONFLICT (key) DO NOTHING`. (Uses `supabase--insert` since this is data, not schema — but `ON CONFLICT` requires a unique index on `key`; if absent I'll add it via migration first.)

## Verification

- Typecheck passes after edits
- Confirm `sections` and `useSection` already exist in `index.tsx` before wiring new sections (quick read)
- Confirm `homepage_sections.key` uniqueness before insert