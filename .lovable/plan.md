## 1. Fix `useWishlist` snapshot caching in `src/lib/wishlist.ts`
The `useSyncExternalStore` snapshot function returns a new array reference on every call because it calls `JSON.parse` each time. This causes React to see constant changes and throw.

Fix: Add module-level cache variables (`lastRaw`, `snapshotCache`) above `useWishlist` and memoize the snapshot using the raw JSON string as the cache key.

## 2. Update `src/components/TopBar.tsx`
- Replace the `Heart` icon import with `Bookmark` (from lucide-react)
- Add `LogIn` icon import
- Add auth state detection (`useEffect` + `supabase.auth.getSession` + `onAuthStateChange`)
- Show a "Sign In" button for guests (links to `/auth`)
- Replace the wishlist link's heart icon with a bookmark icon
- Update aria-label to say "Bookmarks"

## 3. Update heading in `src/routes/wishlist.tsx`
- Replace `Heart` import with `Bookmark`
- Replace the heart icon in the page heading with a bookmark icon (use `fill-primary text-primary`)
- Change title text: "Saved Products" → "Bookmarks"
- Change subtitle text: "Kayan da aka ajiye" → "Abubuwan da aka ajiye"

## 4. Fix slow loading in `src/routes/index.tsx`
**Fix A — Add caching to homepage queries:**
Add `staleTime: 2 * 60 * 1000` and `gcTime: 5 * 60 * 1000` to these four query options:
- `homepage-sections`
- `categories`
- `featured-sellers`
- `featured-products`

**Fix B — Parallelize featured products fallback:**
Replace the `featured-products` `queryFn` with a version that:
- Builds both the featured query and the recent-products fallback query
- Fires both simultaneously via `Promise.all`
- Returns featured results if available, otherwise falls back to recent results
- This eliminates two sequential Supabase round trips when no featured products exist