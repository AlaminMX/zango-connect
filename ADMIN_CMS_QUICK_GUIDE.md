# Admin CMS Quick Reference Guide

## New Admin Pages

### Featured Products Management
**URL:** `/admin/featured-products`

**What It Does:**
Manage which products appear as "Featured" on the homepage.

**How to Use:**
1. Go to Admin Dashboard → Click "Featured Products" (link needed in nav)
2. See "Current Featured" section on left - shows products in display order
3. On right side, search available products by name or seller
4. Click **+** button to add a product to featured list
5. Drag products to reorder using the grip handle
6. Click **Save order** button to persist changes
7. Click **X** button to remove a product

**Key Points:**
- No product can appear twice
- Changes appear on homepage immediately
- Drag-and-drop works on desktop and mobile
- Empty state shows "No featured products yet"

---

### Trending Sellers Management
**URL:** `/admin/trending-sellers`

**What It Does:**
Manage which sellers appear in the "Trending Sellers" section on homepage (max 12 stored, first 3 display).

**How to Use:**
1. Go to Admin Dashboard → Click "Trending Sellers" (link needed in nav)
2. See "Current Trending" section on left - shows sellers in order
3. On right side, search available sellers by name or category
4. Click **+** button to add a seller (disabled if already 12)
5. Drag sellers to reorder
6. Click **Save order** to persist changes
7. Click **X** button to remove a seller

**Key Points:**
- Maximum 12 trending sellers (homepage shows first 3 horizontally)
- Only approved & non-blocked sellers shown in available list
- Mobile-responsive grid layout
- Empty state shows "No trending sellers yet"

---

## Vendor Approval Queue

### What Changed
Vendors now only appear for approval **AFTER** completing BOTH onboarding steps:
1. Step 1: Submit business info (sets status to "step1_complete")
2. Step 2: Upload profile photo (sets status to "step2_complete")
3. THEN: Appear in admin approval queue

### Checking Vendor Progress
Go to Admin Dashboard → "Sellers" tab
- Only vendors with status "step2_complete" appear here
- These are ready to approve/reject
- Incomplete vendors don't show (they complete onboarding later)

---

## New Routes for Developers

### Frontend Routes
```
GET /admin/featured-products         → Featured products management UI
GET /admin/trending-sellers          → Trending sellers management UI
```

### Database Tables
```
featured_products_admin              → Stores featured product assignments
trending_sellers_admin               → Stores trending seller assignments
admin_audit_log                      → Tracks all admin actions
```

---

## What Gets Logged to Audit Trail

Every admin action is recorded in `admin_audit_log`:

**Featured Products:**
- ✓ Product added
- ✓ Product removed
- ✓ Products reordered

**Trending Sellers:**
- ✓ Seller added
- ✓ Seller removed
- ✓ Sellers reordered

**Vendor Actions:**
- ✓ Vendor approved
- ✓ Vendor rejected

*(Admin activity history page coming soon)*

---

## Homepage CMS Service

### For Developers
See `src/lib/homepage-cms.ts` for two functions:

```typescript
// Get featured products for homepage
const products = await getFeaturedProducts();

// Get trending sellers (max 3 for homepage)
const sellers = await getTrendingSellers(3);
```

These functions automatically fetch from CMS tables. No hardcoding needed.

---

## Future CMS Sections (Architecture Ready)

The system is designed to easily add:
- Hero banners
- Promotional campaigns  
- Seasonal collections
- Announcements
- Category spotlights

Just add a table + service function + admin page. No major refactor needed.

---

## Troubleshooting

**"No featured products yet" appears?**
- Navigate to Featured Products page and add some

**"All vendors have been reviewed" message?**
- All vendors with step2_complete status have been approved/rejected
- New vendors will appear as they complete onboarding

**Drag-drop not working?**
- Works on desktop browsers and modern mobile browsers
- Try refreshing page
- Works with mouse and touch

**Changes not showing on homepage?**
- Frontend caches for 5 minutes
- Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Changes appear instantly on new visits

---

## Required Navigation Links (TODO)

Add these links to Admin Dashboard navigation:
- Link to `/admin/featured-products`
- Link to `/admin/trending-sellers`

Example:
```tsx
<Link to="/admin/featured-products">Featured Products</Link>
<Link to="/admin/trending-sellers">Trending Sellers</Link>
```

---

## Testing Checklist

- [ ] Add featured product, verify it appears on homepage
- [ ] Reorder featured products, save, refresh, verify order persists
- [ ] Remove featured product, verify it's gone from homepage
- [ ] Add trending seller (try adding 12), verify limit enforced
- [ ] Reorder trending sellers, verify first 3 show on homepage horizontally
- [ ] Start vendor onboarding, go to admin after step 1 - should NOT appear
- [ ] Complete both steps, vendor SHOULD appear in approval queue
- [ ] Search/filter works on both admin pages
- [ ] Mobile layout is responsive on phones/tablets
- [ ] Drag-drop works on mobile touch
