# Sutura Market — Final Frontend Wiring Plan

Scope is strictly frontend integration. All server functions, RLS, triggers, and tables already exist. No new migrations, no new server functions, no schema edits.

---

## 1. Admin Panel — `src/routes/admin.tsx` (rewrite tabs, keep file)

Add 3 new tabs alongside existing ones. New tab order:
`Sellers · Verification · Migration · Cities · Categories · Featured · Homepage`.

Replace direct `supabase.from(...)` admin writes with `useServerFn` wrappers so every admin action goes through server functions.

### A. Cities tab (new)
- Data: `adminListCitiesWithStats` (already returns sellers_count, products_count, *_added_30d).
- Table rows: emoji-free, each shows name, state, slug, is_active toggle, sellers, products, +30d badges.
- "New city" button → dialog calling `adminUpsertCity` (name, state, is_active, sort_order auto = max+1).
- Edit pencil → same dialog prefilled.
- Delete trash → confirm modal → `adminDeleteCity` (server already blocks delete if sellers reference it; surface that error toast).
- Reorder: ChevronUp/ChevronDown buttons that swap `sort_order` between two rows via two `adminUpsertCity` calls (mirrors existing category/section reorder pattern — no new dnd library).
- Toggle Active: calls `adminUpsertCity` with new is_active.

### B. Verification tab (new)
- Sub-tabs: `Pending | Approved | Rejected | Suspended`.
- Data: `adminListSellersForReview({ status })`.
- Each card: profile photo, business name, owner name, category, city, WhatsApp, bio, created_at, "View documents" button opening `MediaViewer` over `verification_documents` jsonb.
- Actions per card: Approve (instant), Reject (opens reason modal), Suspend (opens reason modal), Request Changes (opens message modal → `sendNotice` severity=warning).
- All actions call `setVerificationStatus`. After success, invalidate the list query.
- Bulk: checkbox column + sticky bottom action bar (`Approve N · Reject N · Suspend N`) → `bulkSetVerification`.

### C. Migration tab (new)
- Same data source as Verification's Pending sub-tab, but explicitly filters sellers whose `verification_decided_at IS NULL` and `created_at < cutoff` (cutoff = constant date set in `verification.functions.ts` migration; client-side filter on the pending list is sufficient — no backend change).
- Table layout (not cards), checkbox selection, sticky bulk bar with the 3 bulk actions → `bulkSetVerification`.
- Processed rows fade out / re-fetch.

### D. Sellers tab cleanup
- Add a "Verification" column showing the status badge.
- Existing `is_verified` toggle stays as-is (separate vouch system).
- "Manage" button per seller opens a simple drawer with: status, subscription expiry, block/suspend buttons calling `setSellerStatus`, `setSubscriptionExpiry`, `deleteSeller`, `sendNotice`. (Drawer is inline JSX in `admin.tsx`; no new component file needed unless it grows large.)

---

## 2. Seller Registration — `src/routes/register.tsx`

- Step 3 "Add your first product" form is **removed entirely**. Pending sellers cannot create products (DB trigger blocks them anyway).
- After Step 2 (photos) submit succeeds → go straight to a new final confirmation screen (replaces current step 4 "Your store is live").

New confirmation screen content:
- 🟡 large icon, heading "Your application has been submitted"
- Body: explains store is under review, typical review window, that they'll be notified by in-app notice.
- Bullet list: what they can do now (edit profile, upload docs), what they cannot (publish products) until approved.
- Single CTA "Return to homepage" (Link to `/`). No "View my store" / share buttons (store is not yet public).

Remove `pName/pPrice/pDesc/pImg/submitStep3` state and helpers.

---

## 3. Seller Dashboard Verification Banner

- `src/routes/store.$slug.tsx` is the unified seller dashboard. At top, when viewing as owner, fetch the seller's `verification_status` + `rejection_reason`.
- Render `<VerificationBanner />` (already exists) for pending/rejected/suspended; render `<ApprovedBanner />` once on first approved view (dismissible via localStorage flag).
- When status ≠ approved, hide the "Add product" UI and any product editing controls. Existing products still listed read-only.
- Public visitors are unaffected (RLS already hides unapproved stores; this guards the owner-view code path).

---

## 4. Reusable Image System (new components + replacements)

### New files
- `src/components/ImageUploader.tsx` — props: `value`, `onChange(url)`, `bucket="sutura"`, `pathPrefix`, `aspect` (1 | 16/9 | 4/3 | 3/4), `maxSizeMb=5`, `label`. Uses `react-easy-crop` + `browser-image-compression`, uploads via browser `supabase.storage.from(bucket).upload(...)`, returns public URL. Handles delete/replace.
- `src/components/MediaViewer.tsx` — full-screen lightbox: props `images: string[]`, `open`, `onOpenChange`, `initialIndex`. Keyboard + swipe navigation, uses existing `Dialog`.

### Dependencies to add (no other deps)
- `react-easy-crop`
- `browser-image-compression`

### Replace at these call sites (delete legacy `<Input type="file">` blocks)
- `src/routes/register.tsx` step 2 — profile photo (aspect 1), cover (aspect 16/9).
- `src/routes/store.$slug.tsx` — owner profile/cover edit + product image edit/create.
- `src/routes/admin.tsx` — category icon (still emoji-based; leave as-is) and any product image admin edit.
- Verification documents upload in seller dashboard ("Upload verification documents" panel; new panel under banner) — `aspect="auto"`, multiple uploads, writes to `sellers.verification_documents` jsonb array.

Wherever images are displayed in a tappable context (product cards modal, store gallery, verification doc preview, admin queue card), wrap with `MediaViewer` open-on-click.

---

## 5. Wishlist + Account

### A. ProductCard heart → DB
- `src/components/ProductCard.tsx`: remove `localStorage` reads/writes. New flow:
  - Maintain a React Query cache key `["wishlist-ids", userId]`.
  - If no session → open existing auth flow (`nav({ to: "/auth", search: { redirect: currentPath } })`) with toast "Sign in to save items".
  - If session → upsert/delete row in `wishlists` via direct authenticated client (RLS already scopes to `auth.uid()`). Invalidate cache.
- One-time migration: on first authenticated mount of `App`, if `localStorage.sutura_wishlist` non-empty, insert any missing rows then clear the key.

### B. `/wishlist` route
- Replace localStorage source with TanStack Query over `supabase.from("wishlists").select("product_id, products(...)")`. Empty state unchanged. Sign-in prompt if no session.

### C. `/account` (new route file `src/routes/account.tsx`)
- Guarded: redirect to `/auth` if no session, redirect to `/store/$slug` if user is a seller (sellers use the store dashboard).
- Tabs: `Profile | Wishlist | Recently viewed`.
- Profile: name input (writes `profiles.display_name`), preferred city `<Select>` populated from `listActiveCities` (writes `profiles.preferred_city_id`).
- Wishlist: same grid as `/wishlist` route, reuses the query.
- Recently viewed: `supabase.from("recently_viewed").select("product_id, viewed_at, products(...)").order("viewed_at desc")` rendered as ProductCards.
- Add a small `recordRecentlyView(productId)` helper called from product detail open (existing ProductCard click handler or product modal — wherever the product is viewed). Trigger already caps at 50.

---

## 6. Wiring rules (enforced during implementation)
- All admin mutations use `useServerFn(...)` from `cities.functions.ts`, `verification.functions.ts`, `admin.functions.ts`. No direct `supabase.from(...).update/delete/insert` from admin tabs except for read-only `select`.
- Buyer-side reads stay on the browser client (RLS already filters).
- No new tables, columns, triggers, policies, or server functions.

---

## Files changed / created

```text
src/components/ImageUploader.tsx          (new)
src/components/MediaViewer.tsx            (new)
src/components/admin/CitiesTab.tsx        (new, split for size)
src/components/admin/VerificationTab.tsx  (new)
src/components/admin/MigrationTab.tsx     (new)
src/components/admin/SellerManageDrawer.tsx (new)
src/routes/admin.tsx                      (refactor: add tabs, server-fn wiring)
src/routes/register.tsx                   (remove step 3, new confirmation screen)
src/routes/store.$slug.tsx                (verification banner + gate product UI + ImageUploader)
src/routes/wishlist.tsx                   (DB-backed, drop localStorage)
src/routes/account.tsx                    (new)
src/components/ProductCard.tsx            (heart → wishlists table, auth prompt)
src/routes/__root.tsx                     (one-time localStorage→DB wishlist migration on auth)
package.json                              (+ react-easy-crop, + browser-image-compression)
```

No migrations. No edits to `src/integrations/supabase/*`, `src/lib/*.functions.ts`, or `src/start.ts`.

---

## Known gaps to flag (do NOT fix in this pass)
- True multi-item orders / checkout (out of scope by prior decision).
- Email/WhatsApp notifications on verification decisions.
- pg_cron for subscription expiry.
- Admin city analytics chart visualization (numbers shown, no charts).

## Success checks
- Admin can CRUD cities, see stats, reorder.
- Verification queue: single + bulk approve/reject/suspend + reason modal → audit log row appears.
- Migration tab processes legacy pending sellers.
- New seller after registration lands on confirmation screen, cannot reach product creation.
- Approved seller sees green banner once; pending sees yellow with no product UI.
- Heart on product card while logged-out → auth prompt. Logged in → row in `wishlists`.
- `/account` profile updates persist; preferred city drives city filter via existing hook.
- No remaining `<Input type="file">` in upload flows; all use `<ImageUploader />`.
