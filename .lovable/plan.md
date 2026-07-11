## Verification plan

Run a live end-to-end verification against the running preview using Playwright + Supabase read queries, then fix anything that fails. No code changes go in before the tests actually run and reveal a real issue.

### 1. WhatsApp CTA on product page
- Pick a live approved seller with an active product (`supabase--read_query`).
- Playwright: open `/product/$id`, screenshot the page, read the "Order on WhatsApp" anchor's `href`, and assert:
  - host is `wa.me`
  - phone matches the seller's `whatsapp_number` normalised to `234…`
  - decoded `text` param contains the product name

### 2. `city_id` auto-assignment on registration
- Confirm code path in `src/routes/register.tsx` (already looks up `cities_of_business` by `ilike(name, city)` before insert).
- DB check: `SELECT COUNT(*) FROM sellers WHERE city IS NOT NULL AND city_id IS NULL AND onboarding_status IN ('step1_complete','step2_complete')` — any rows are a bug.
- Spot-check: for a recent seller, verify `city_id` matches the row in `cities_of_business` whose name matches `city`.
- If any mismatch → backfill migration to set `city_id` from `cities_of_business` by case-insensitive name.

### 3. Public store page (logged-out)
- Playwright with a fresh context (no auth cookies/localStorage), navigate to `/store/<slug>` for a known approved seller, screenshot, and assert the page does NOT contain "Store not found" and DOES contain the business name.

### 4. Admin Sellers tab
- Playwright: restore the injected admin Supabase session, open `/admin`, click the Sellers tab, screenshot, and assert at least one seller row is visible.
- Cross-check the count against `SELECT COUNT(*) FROM sellers WHERE onboarding_status IN ('step1_complete','step2_complete')`.

### Fix pass
- For each failing check, apply the minimal fix (query filter, RLS/GRANT, link builder, city backfill) and re-run just that check.
- Report a compact pass/fail table with screenshot paths and any fixes applied.

### Technical notes
- Auth env: `LOVABLE_BROWSER_AUTH_STATUS` gates the admin test; if not `injected`, skip step 4 and report why.
- Public store test must NOT restore any Supabase session — it validates anon RLS.
- All Playwright artifacts under `/tmp/browser/verify/`.