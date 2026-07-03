# Admin CMS Implementation Checklist

## Pre-Deployment Verification

### Database & Migrations
- [ ] Run migration: `supabase/migrations/20260703140000_add_cms_and_vendor_workflow.sql`
- [ ] Verify `featured_products_admin` table created
- [ ] Verify `trending_sellers_admin` table created
- [ ] Verify `admin_audit_log` table created
- [ ] Verify `sellers.onboarding_status` column added
- [ ] Verify RLS policies applied
- [ ] Verify indexes created for performance

### Code Changes
- [ ] `src/routes/register.tsx` - Updated onboarding_status logic
- [ ] `src/routes/admin.tsx` - Updated seller filtering
- [ ] `src/routes/explore.tsx` - Integrated CMS trending sellers
- [ ] `src/routes/admin.featured-products.tsx` - Created (new file)
- [ ] `src/routes/admin.trending-sellers.tsx` - Created (new file)
- [ ] `src/lib/homepage-cms.ts` - Created (new file)
- [ ] `src/lib/audit-log.ts` - Created (new file)

### TypeScript & Linting
- [ ] No TypeScript errors in console
- [ ] No ESLint warnings
- [ ] All imports resolve correctly
- [ ] Build completes successfully

## Feature Testing

### Vendor Onboarding Workflow
- [ ] Start vendor registration, complete step 1, stop
  - Expected: Does NOT appear in admin approval queue
  - Expected: Vendor can resume onboarding later
  - Expected: Status shows "step1_complete" in DB
- [ ] Vendor completes step 2
  - Expected: NOW appears in admin approval queue
  - Expected: Status shows "step2_complete" in DB
- [ ] Admin approves vendor
  - Expected: Vendor marked "approved"
  - Expected: Vendor appears on marketplace

### Featured Products Page

#### Basic Operations
- [ ] Navigate to `/admin/featured-products`
  - Expected: Page loads without errors
  - Expected: Shows "Current Featured" section (empty if none)
  - Expected: Shows "Available Products" section
- [ ] Search for product
  - Expected: Results filter by name
  - Expected: Results filter by seller name
- [ ] Add product to featured
  - Expected: Moves from Available to Current Featured
  - Expected: Audit log records "featured_product_added"
  - Expected: Homepage immediately shows product
- [ ] Remove product from featured
  - Expected: Moves from Current to Available
  - Expected: Audit log records "featured_product_removed"
  - Expected: Homepage no longer shows product

#### Drag-Drop & Ordering
- [ ] Add 3+ featured products
- [ ] Drag first product to third position
  - Expected: Order updates in UI
  - Expected: No "Save order" button until reorder complete
- [ ] Click "Save order"
  - Expected: Saves to database
  - Expected: Audit log records "featured_products_reordered"
  - Expected: Order persists after page refresh
- [ ] Test drag-drop on mobile
  - Expected: Works with touch

#### Edge Cases
- [ ] Try adding duplicate product
  - Expected: Can't add (either disabled or shows error)
- [ ] Add maximum products (no limit currently)
  - Expected: All save successfully
- [ ] With 0 featured products
  - Expected: Empty state message shows

### Trending Sellers Page

#### Basic Operations
- [ ] Navigate to `/admin/trending-sellers`
  - Expected: Page loads without errors
  - Expected: Shows max 12 limit
  - Expected: Shows "Current Trending" section (empty if none)
  - Expected: Shows "Available Sellers" section
- [ ] Search for seller
  - Expected: Filters by business name
  - Expected: Filters by category
- [ ] Add seller to trending
  - Expected: Moves from Available to Current
  - Expected: Audit log records "trending_seller_added"
  - Expected: Homepage shows in first 3 position (if room)
- [ ] Try adding 13th seller
  - Expected: Button disabled or error shown
  - Expected: Can't exceed 12
- [ ] Remove seller from trending
  - Expected: Moves back to Available
  - Expected: Audit log records "trending_seller_removed"
  - Expected: Homepage updates

#### Drag-Drop & Ordering
- [ ] Add 3+ trending sellers
- [ ] Reorder via drag-drop
- [ ] Click "Save order"
  - Expected: Persists to database
  - Expected: Audit log records action
  - Expected: Order survives page refresh
- [ ] Test homepage
  - Expected: First 3 sellers display horizontally
  - Expected: Correct order shown

#### Mobile Testing
- [ ] View on mobile browser
  - Expected: Two-column layout responsive
  - Expected: Drag-drop works with touch
  - Expected: Text doesn't overflow
  - Expected: Buttons are touch-friendly

### Homepage Display

#### Trending Sellers Section
- [ ] With 0 trending sellers
  - Expected: Section not visible
- [ ] With 1-3 trending sellers
  - Expected: Section shows all (3-column grid)
  - Expected: Responsive on mobile (stacked)
  - Expected: Profile photos display
  - Expected: Business names display
  - Expected: Categories display
  - Expected: Clickable to seller store
- [ ] With 12 trending sellers
  - Expected: Homepage shows only first 3
  - Expected: Correct order maintained

#### Featured Products (if integrated)
- [ ] Featured products display on homepage
- [ ] Order correct per admin settings
- [ ] Update immediately after admin changes

### Admin Dashboard

#### Vendor Approval Queue
- [ ] Only step2_complete vendors appear
- [ ] Incomplete onboarding vendors hidden
- [ ] Approve vendor functionality works
- [ ] Reject vendor functionality works
- [ ] Audit log records approvals/rejections

## Audit Logging Verification

- [ ] Audit log table has entries
- [ ] Each featured product action logged
- [ ] Each trending seller action logged
- [ ] Admin ID recorded correctly
- [ ] Timestamp correct
- [ ] Details/JSON data populated
- [ ] Can query audit log by action type
- [ ] Can query audit log by admin

## Performance Testing

### Load Times
- [ ] Featured products page loads <2s
- [ ] Trending sellers page loads <2s
- [ ] Homepage loads <3s
- [ ] Search responds instantly (<200ms)

### Database Queries
- [ ] No N+1 queries in featured products load
- [ ] No N+1 queries in trending sellers load
- [ ] Indexes used for sorting/filtering
- [ ] RLS policies don't slow queries

### Frontend Caching
- [ ] Trending sellers cached 5 minutes
- [ ] Hard refresh (Ctrl+F5) shows fresh data
- [ ] Subsequent visits hit cache (fast load)

## Security Testing

### Admin Access Control
- [ ] Non-admin cannot access `/admin/featured-products`
  - Expected: Redirects to home or auth
- [ ] Non-admin cannot access `/admin/trending-sellers`
  - Expected: Redirects to home or auth
- [ ] Logged-in vendor cannot access featured/trending pages
  - Expected: Redirects or shows error

### RLS Policies
- [ ] Public can read featured_products_admin
  - Expected: SELECT works without auth
- [ ] Non-admin cannot insert to featured_products_admin
  - Expected: RLS denies INSERT
- [ ] Non-admin cannot update featured_products_admin
  - Expected: RLS denies UPDATE
- [ ] Non-admin cannot read admin_audit_log
  - Expected: RLS denies SELECT

## Data Integrity

- [ ] No duplicate featured products
- [ ] No duplicate trending sellers
- [ ] Product can be added again after removal
- [ ] Seller can be added again after removal
- [ ] Removing product doesn't delete product record
- [ ] Removing seller doesn't delete seller record
- [ ] Featured/trending tables independent
  - Can have product featured and trending separately

## Regression Testing

### Existing Features (No Breaking)
- [ ] User can still browse products
- [ ] Search functionality works
- [ ] Vendor onboarding flow complete (step 1 + 2)
- [ ] Admin can still approve/reject vendors
- [ ] Product uploads work
- [ ] Shopping cart/checkout works
- [ ] Messaging system works
- [ ] Wishlist works

### Admin Functions
- [ ] Admin can block vendors
- [ ] Admin can view products
- [ ] Admin can manage categories
- [ ] Admin can view stats/dashboard

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Accessibility

- [ ] All buttons have proper labels
- [ ] Links have descriptive text
- [ ] Drag-drop items keyboard accessible
- [ ] Search inputs labeled properly
- [ ] Empty states visible and readable
- [ ] Color contrast meets standards

## Post-Deployment Monitoring

Once deployed:

- [ ] Monitor admin page error logs
- [ ] Check database query performance
- [ ] Track audit log volume (not growing too fast)
- [ ] Monitor homepage load times
- [ ] Track admin usage metrics
- [ ] Collect user feedback on new pages

## Documentation Checklist

- [ ] ADMIN_CMS_IMPLEMENTATION_REPORT.md created
- [ ] ADMIN_CMS_QUICK_GUIDE.md created
- [ ] CMS_IMPLEMENTATION_SUMMARY.md created
- [ ] IMPLEMENTATION_CHECKLIST.md created
- [ ] Add nav links to Featured Products page
- [ ] Add nav links to Trending Sellers page
- [ ] Team trained on new features
- [ ] Update README with new routes

## Final Sign-Off

- [ ] All tests passed
- [ ] No breaking changes
- [ ] Performance acceptable
- [ ] Security policies enforced
- [ ] Documentation complete
- [ ] Team ready for deployment

**Status:** ☐ Ready for Production

---

**Deployment Date:** _________________
**Deployed By:** _________________
**Notes:** 
