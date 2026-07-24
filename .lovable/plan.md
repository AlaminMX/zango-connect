## Goal

Rebuild the location system around a real **State → City → Vendor → Product** hierarchy, replace "Explore by City" with "Explore by State", auto-create States and Cities during vendor onboarding, and make all counts accurate and consistent by deriving them from joins/views rather than stored numbers.

## Current state (verified)

- No `states` table. `cities_of_business` stores `state` as free text, so the same state can appear with different casing/spellings and cities are effectively orphaned strings.
- `sellers` has both free-text `state`/`city` and a `city_id` FK. There is no `state_id`.
- Homepage `ExploreCities` reads `cities_with_stats` view and shows top 5 featured cities.
- Existing seed data has 6 cities across 5 states (Kaduna row's slug is even `kaduna`, showing prior data drift).
- `ensure_city(name, state)` already auto-creates cities on seller insert via `sellers_auto_set_city_id`.

Counts are unreliable today because filtering joins on the free-text `sellers.city` string in several places instead of `city_id`, and there is no state-level relation at all.

## Plan

### 1. Database — introduce `states`, link everything, derive counts

Single migration:

- Create `public.states(id, name unique-ci, slug unique, is_active bool default false, is_featured_home bool default false, sort_order int, created_at, updated_at)`. Default `is_active=false` so new auto-created states are hidden until an admin toggles them (matches "pending/hidden by default").
- Add `cities_of_business.state_id uuid references states(id) on delete restrict`, backfill from existing `state` text (creating a `states` row per distinct value), then set `NOT NULL`. Keep `state` text column temporarily for compatibility, but stop reading it.
- Add unique index on `cities_of_business (state_id, lower(name))` so no duplicate city within a state.
- Add `sellers.state_id uuid references states(id)`, backfill from `city_id -> state_id`.
- Replace `ensure_city(name, state)` with:
  - `ensure_state(name) returns uuid` — case-insensitive lookup, else insert with `is_active=false`.
  - `ensure_city(name, state) returns uuid` — resolves state via `ensure_state`, then finds/inserts city under that `state_id` with `is_active=false` by default.
- Update `sellers_auto_set_city_id` trigger to also set `state_id` from the resolved city.
- Recreate the stats view as two views (both `security_invoker=true`, both driven by joins on `seller.city_id`/`state_id` — no cached counters):
  - `states_with_stats(id, name, slug, is_active, is_featured_home, sort_order, cities_count, sellers_count, products_count)`
  - `cities_with_stats(id, name, slug, state_id, state_name, state_slug, is_active, is_featured_home, sort_order, sellers_count, products_count)` — counts only active/approved/non-blocked sellers and their active products so the homepage numbers match what the user actually sees.
- RLS + GRANTs for `states` (public read of `is_active=true`, admin full write via `has_role`). Keep existing city policies, add policy so cities are only publicly readable when both the city and its parent state are active.

### 2. Onboarding — auto-create State + City

- In `src/routes/register.tsx`, submit both `state` and `city` free-text as today. The DB trigger (updated `ensure_city`) handles State + City creation atomically. No client change needed beyond making sure both fields are sent.
- Newly created states/cities land in Admin with `is_active=false` and are invisible to buyers until toggled.

### 3. Server functions

Refactor `src/lib/cities.functions.ts` and add a sibling `src/lib/states.functions.ts`:

- `listActiveStates` — public, from `states_with_stats` where `is_active`.
- `listCitiesForState({ stateSlug })` — public, active cities of an active state, from `cities_with_stats`.
- `getStateMarketplace({ slug })` — for optional state landing page (list of cities).
- `getCityMarketplace({ slug })` — already exists; switch its joins to strictly filter on `sellers.city_id = city.id` (drop any free-text city matching) and also require the parent state active.
- Admin: `adminListStatesWithStats`, `adminSetStateActive`, `adminSetStateFeatured` (cap 5 featured states), `adminSetCityActive`, `adminSetCityFeatured`. Keep existing city upsert/delete; add equivalents for states.

### 4. Frontend

- Rename/replace `src/components/ExploreCities.tsx` with `ExploreStates.tsx`: same tile design, shows top 5 featured active states + "More states" tile linking to `/states`. Each tile shows state name, vendor count, product count from `states_with_stats`.
- New route `src/routes/states.tsx` — full searchable directory of active states with counts.
- New route `src/routes/state.$slug.tsx` — shows all active cities under that state as tiles with vendor/product counts; each links to `/city/$slug`.
- Keep `src/routes/city.$slug.tsx` but fix its query to fetch vendors/products purely by `city_id` (no `.limit(60)` cap that currently hides sellers/products — paginate instead). Also render the parent state name and a back link.
- Update `src/routes/index.tsx` to render `<ExploreStates />` in place of `<ExploreCities />`.
- Update filter dropdowns in `src/routes/products.tsx`, `src/routes/sellers.tsx`, `src/routes/search.tsx` to filter by `city_id`/`state_id` instead of free-text `sellers.city`, fixing the "only one vendor shown" bug caused by string-mismatch joins.
- Delete `/cities` route (or redirect to `/states`), and remove `ExploreCities.tsx`.

### 5. Admin dashboard — hierarchical location manager

In `src/routes/admin.tsx`, replace the flat cities table with a two-level expandable tree:

```text
State [active toggle] [featured toggle]  · N cities · V vendors · P products
   └─ City [active toggle] [featured toggle]  · V vendors · P products
   └─ City ...
```

- Data source: `adminListStatesWithStats` + lazy load `cities_with_stats` per expanded state.
- Toggles call the new admin server functions. Disabling a state hides all its cities from buyers automatically (enforced by the RLS/view join, not by cascading writes) so admins don't have to toggle each city.
- Show newly auto-created states/cities at the top with a "New" badge until an admin sets active.

### 6. Data migration & cleanup

Inside the same migration:

- Backfill `states` from every distinct `cities_of_business.state` and `sellers.state`, normalized (trim + case-insensitive dedupe, e.g. `FCT` stays one row).
- Set every existing state and city to `is_active=true` so live data isn't hidden by the new default.
- Backfill `sellers.state_id` from resolved `city_id`.
- Fix the wrong `kaduna` slug on the Zaria row by regenerating city slugs as `slugify(state)-slugify(city)` where collisions exist.

### 7. Verification

After migration + code changes:

- Query `states_with_stats` and `cities_with_stats` and confirm vendor/product totals equal direct `COUNT(*)` on `sellers`/`products` filtered the same way.
- Register a test seller with a brand-new state and brand-new city, confirm both appear in Admin as inactive with correct counts, and are invisible on the homepage until toggled.
- Open `/city/$slug` for a city with multiple sellers and confirm every seller and every product shows (no silent cap).

## Out of scope

- No changes to product schema, WhatsApp flow, wishlist, auth, or MCP tools.
- No visual redesign of tiles beyond swapping label from City → State.
- Free-text `sellers.city`/`sellers.state` columns are kept for now (read-only) to avoid breaking older UI; a follow-up can drop them once nothing reads them.
