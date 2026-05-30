# Admin Moderation & Seller Lifecycle System

A full moderation layer for Sutura Market: seller blocking/deletion, product moderation, prominent seller notices, manual subscription control, and an admin audit log.

## 1. Database changes

### New columns on `public.sellers`
- `status text NOT NULL DEFAULT 'active'` — one of `active | suspended | expired | blocked`
- `subscription_expires_at timestamptz` (nullable) — informational, manually set by admin
- `blocked_at timestamptz`, `blocked_reason text` (nullable)

`is_verified` stays unchanged. Public visibility is now driven by `status = 'active'`.

### New column on `public.products`
- `status text NOT NULL DEFAULT 'active'` — one of `active | blocked`
- `blocked_at timestamptz`, `blocked_reason text` (nullable)

### New table `public.seller_notices`
- `id uuid pk`, `seller_id uuid`, `created_by uuid` (admin), `title text`, `message text`,
  `severity text` (`info | warning | critical`), `created_at`, `read_at timestamptz` (nullable)
- GRANTs + RLS: seller can `SELECT` & `UPDATE` (only `read_at`) own rows; admin full access via `has_role`.

### New table `public.admin_audit_log`
- `id`, `admin_id uuid`, `action text` (e.g. `seller.block`, `product.delete`, `notice.send`, `subscription.change`),
  `target_type text` (`seller|product|notice|subscription`), `target_id uuid`, `metadata jsonb`, `created_at`
- GRANTs + RLS: only admins can `SELECT`/`INSERT` (insert from server-side admin code).

### RLS updates
- **Sellers** `sellers_public_read`: change `USING (true)` → `USING (status = 'active' OR has_role(auth.uid(),'admin') OR auth.uid() = user_id)` so blocked/suspended/expired stores disappear from public queries while owners + admins still see them.
- **Products** `products_public_read`: change to `USING (status = 'active' AND EXISTS(SELECT 1 FROM sellers s WHERE s.id = products.seller_id AND s.status = 'active') OR has_role(auth.uid(),'admin') OR EXISTS(SELECT 1 FROM sellers s WHERE s.id = products.seller_id AND s.user_id = auth.uid()))`.
- **Sellers** add `sellers_delete_admin` already exists; add policy preventing seller from changing own `status` (trigger `prevent_self_status_change` similar to `prevent_self_verify`).
- **Products** add trigger preventing seller from changing own `status` away from admin-set `blocked`.

### Trigger
- `seller_notices`: on update, only allow `read_at` to change for the seller; admin unrestricted.

## 2. Admin UI (`/admin`)

Tabs: **Sellers · Products · Notices · Audit log**.

### Sellers tab
Row shows: business name, store slug, registered date, status badge, product count, subscription expiry.
Actions menu: View store · Send notice · Block/Unblock · Suspend/Activate · Set expiry · Delete.
- Block/Suspend/Activate update `sellers.status`.
- Delete opens confirm dialog showing seller name + product count + irreversible warning. Deletes products → notices → seller row (cascade order in a server fn).

### Products tab
List of recent products with seller, price, status. Actions: View · Block/Unblock · Delete (confirm dialog showing product name + image).

### Notices tab
"Send notice" form: pick seller (searchable), title, severity, message. List recent notices with read state + timestamp.

### Audit log tab
Reverse-chronological table of `admin_audit_log` entries.

All admin mutations go through `createServerFn` handlers in `src/lib/admin.functions.ts` using `requireSupabaseAuth` + `has_role` check, writing audit rows via `supabaseAdmin`.

## 3. Seller dashboard (`/dashboard`)

Top of page renders:
- **Status banner** when `seller.status !== 'active'`:
  - `blocked` / `suspended` → red: "Your store is currently inactive. Please contact support for assistance."
  - `expired` → amber: "Your subscription has expired. Contact admin to renew."
- **Notice cards** for all unread `seller_notices`, full-width, color-coded by severity (blue/amber/red), each with "Mark as read" button that sets `read_at = now()`.

Product list in dashboard shows a "Blocked by Administration" badge on products where `status='blocked'`; the edit form disables the publish toggle for those.

## 4. Public surfaces

No code changes needed in `/`, `/search`, `/category/$slug`, `/store/$slug` — the tightened RLS policies automatically hide non-active sellers and non-active products. Verify each query still works for the owner/admin path.

## 5. Files

**New**
- `src/lib/admin.functions.ts` — server fns: `setSellerStatus`, `deleteSeller`, `setProductStatus`, `deleteProduct`, `sendNotice`, `setSubscriptionExpiry`, `listAuditLog`, all admin-gated + audit-logged.
- `src/lib/notices.functions.ts` — `markNoticeRead` for sellers.
- `src/components/admin/SellersTable.tsx`, `ProductsTable.tsx`, `NoticesPanel.tsx`, `AuditLogTable.tsx`, `ConfirmDialog.tsx`.
- `src/components/dashboard/StatusBanner.tsx`, `NoticeCard.tsx`.
- Migration file under `supabase/migrations/`.

**Modified**
- `src/routes/admin.tsx` — replace single list with tabbed layout.
- `src/routes/dashboard.tsx` — render `StatusBanner` + notice cards at top; show blocked badge in product list.
- `src/start.ts` — ensure `attachSupabaseAuth` already registered (it is).

## 6. Security

- All admin actions verified server-side with `has_role(auth.uid(), 'admin')`; client role checks are UX only.
- Triggers prevent sellers from self-editing `status` (seller) or `status` (product when blocked by admin) and from forging `read_at` on others' notices.
- Audit log is insert-only from server fns using `supabaseAdmin`; sellers cannot read it.

## 7. Verification checklist

1. Block a seller → store + products vanish from `/`, `/search`, category, but seller still logs in and sees red banner.
2. Unblock → reappears.
3. Block a product → gone from public, seller sees "Blocked by Administration".
4. Delete seller (with products) → confirm dialog, then fully removed.
5. Send INFO/WARNING/CRITICAL notice → appears at top of dashboard with correct color; "Mark as read" updates admin view.
6. Subscription: set to `expired` → public hidden, amber banner shown.
7. Every admin action shows up in audit log with admin email + timestamp.

## 8. Future improvements
- Email/WhatsApp delivery for critical notices.
- Automated expiry via pg_cron flipping `active` → `expired` when `subscription_expires_at < now()`.
- Admin search/filter in audit log.
- Per-product moderation reasons surfaced to seller.
