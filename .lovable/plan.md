## Logo

Apply this current one and remove the one from the previous turn (that one has a backgroung that was not removed) this is a fixed version

## Explore by City — end-to-end fix

### 1. Auto-create cities on seller registration (DB)

Migration adds an admin-safe function `public.ensure_city(name, state)`:

- Normalises name/state (trim, title-case).
- Looks up existing `cities_of_business` by case-insensitive name + state.
- If found → returns its id.
- If not → inserts a new row with `is_active = true`, `is_featured_home = false`, unique slug (`slugify(name)-slugify(state)` with numeric suffix on conflict), `sort_order = 9999`. Returns new id.
- `SECURITY DEFINER`, callable by `authenticated`.

Add column `cities_of_business.is_featured_home boolean not null default false` — controls homepage 5.

Trigger `sellers_set_city_id_before_write` (BEFORE INSERT/UPDATE on `sellers`): when `city` and `state` are set and `city_id` is null, calls `ensure_city(city, state)` and sets `city_id`. Guarantees every seller has a `city_id`, even if the frontend forgets.

One-off backfill in same migration: for every seller with `city IS NOT NULL AND state IS NOT NULL AND city_id IS NULL`, populate via `ensure_city`.

### 2. Homepage "Explore by city" — top 5 + More tile

Rewrite `src/components/ExploreCities.tsx`:

- Query `cities_with_stats` filtered to `is_active = true`.
- Sort: `is_featured_home DESC, sellers_count DESC, sort_order ASC, name ASC`.
- If admin has featured ≥1 city, featured cities fill first slots up to 5; remaining slots filled by top sellers_count.
- Take first 5. Render 6th tile "More cities" → `<Link to="/cities">` with distinct styling (dashed border, ArrowRight icon).
- Grid stays `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` so 6 tiles align on desktop.

### 3. New `/cities` page (`src/routes/cities.tsx`)

Public SSR route. Fetches all active cities via a new public server fn `listAllActiveCitiesWithStats` (uses server publishable client, reads `cities_with_stats` where `is_active`).

UI:

- `head()` with unique title/description/canonical + `CollectionPage` JSON-LD.
- Header + search input (client-side, debounced) that filters by city name OR state name (case-insensitive substring).
- Grouped rendering: cities grouped by state, each state a section heading; within state, cities sorted by sellers_count desc.
- Each tile links to `/city/$slug` (existing route).
- Empty-state when search yields nothing.

### 4. Admin controls (`src/routes/admin.tsx` — Cities tab)

Extend existing city admin table:

- New "Homepage" toggle column bound to `is_featured_home`. Enforce max 5 featured with a client-side check + server-side validation in the upsert fn (throw if trying to feature a 6th).
- Existing add/edit/activate/sort remain.

Server fns updated in `src/lib/cities.functions.ts`:

- `adminUpsertCity` extended to accept `is_featured_home`; validates ≤5 featured.
- Add `adminSetCityFeatured({ id, featured })` for quick toggle.

### 5. Public grants

Ensure `cities_of_business` and `cities_with_stats` view remain readable by `anon` (already are). New `is_featured_home` column inherits table grants.

## Files touched

- **New migration** — `ensure_city` function, `is_featured_home` column, sellers trigger, backfill.
- **New**: `src/routes/cities.tsx`, `src/lib/cities-public.functions.ts` (public listing).
- **Edit**: `src/components/ExploreCities.tsx` (top-5 + More tile), `src/lib/cities.functions.ts` (featured toggle + validation), `src/routes/admin.tsx` (Homepage toggle in cities tab).

## Technical notes

- `ensure_city` is `SECURITY DEFINER` so unverified sellers (who otherwise can't insert into `cities_of_business`) can still trigger city creation during onboarding via the trigger path.
- Featured-max-5 enforced server-side: `SELECT count(*) FROM cities_of_business WHERE is_featured_home` before setting a new one to true.
- `cities_with_stats` view already exposes `sellers_count`; no view change needed.
- Search on /cities is fully client-side over the (small) active-cities list — no extra server calls, snappy UX.