# Plan: Editorial Marketplace Bento Redesign

You picked **v3 — Editorial Marketplace Bento**. I'll roll it across the whole site using a single locked design system. No business logic changes; only presentation.

## Locked design tokens (added to `src/styles.css`)

| Token | Value | Use |
|---|---|---|
| `--background` | `#FCF9F5` (warm bone) | Page bg |
| `--surface` | `#FFFFFF` | Tile bg |
| `--surface-warm` | `#F2EDE7` | Soft tile bg |
| `--border-warm` | `#E5D5C5` | Tile borders |
| `--primary` (terracotta) | `#C05A3F` | Hero, CTAs, accents |
| `--primary-deep` | `#B04A2F` | Hover/depth |
| `--sage` | `#8A9A5B` | Secondary accent, prices |
| `--sage-deep` | `#7A8A4B` | Sage hover |
| `--espresso` | `#3E2723` | Headings, dark tiles |
| `--muted-fg` | `#7A6B5D` | Body copy |
| Heading font | DM Serif Display | Loaded via `<link>` in `__root.tsx` |
| Body font | Fira Sans (300/400/500/600) | Same |

Radius: `rounded-3xl` (24px) tiles, `rounded-2xl` inner. Shadows: soft single-layer.

## Files I'll touch

### 1. Design system foundation
- `src/styles.css` — replace color tokens with terracotta/sage palette, register `--font-display` + `--font-sans` via `@theme`, drop legacy purple/rose tokens.
- `src/routes/__root.tsx` — add DM Serif Display + Fira Sans `<link>` tags in `<head>`, set body `font-sans`.
- `tailwind` usage stays via `@theme` tokens — no JS config.

### 2. Shared chrome
- `src/components/TopBar.tsx` — repaint as warm-bone bar with espresso wordmark, sage hover states, terracotta active.
- `src/components/Footer.tsx` — espresso-on-bone, DM Serif heading.
- `src/components/SellerBottomNav.tsx` — bone bg, terracotta active pill.
- `src/components/SellerCard.tsx` + `ProductCard.tsx` — rounded-3xl warm-bordered tiles, sage price, espresso "WhatsApp Vendor" CTA matching the prototype.
- `src/components/LoadingSpinner.tsx` (skeletons) — match new tile shape/radius.

### 3. Homepage — full bento rebuild
- `src/routes/index.tsx` — rebuild layout as a 12-col bento grid mirroring v3:
  - Hero search tile (col-span 8, row-span 3, terracotta)
  - Top Sellers tile (col-span 4, row-span 2, white)
  - Categories tile (col-span 4, row-span 2, sage)
  - Explore City tile (col-span 3, row-span 2, warm)
  - Two featured product tiles (col-span 3, row-span 3 each)
  - Verified-sellers stat tile (espresso)
  - Second city hub tile (warm)
  - Below the bento: the full product grid stays, restyled as the same tile vocabulary.

### 4. Listing & detail pages
- `src/routes/products.tsx`, `sellers.tsx`, `search.tsx`, `category.$slug.tsx`, `city.$slug.tsx`, `wishlist.tsx` — page header in DM Serif on bone, filters as warm pill tiles, results as the new product/seller tile.
- `src/routes/store.$slug.tsx` — storefront hero as a terracotta bento tile with sage stat chip; product grid uses new card.

### 5. Auth + account
- `src/routes/auth.tsx`, `register.tsx`, `reset-password.tsx`, `verify-email.tsx`, `account.tsx` — bone background, white card with warm border, DM Serif headings, sage primary buttons where secondary, terracotta for primary CTAs.

### 6. Dashboard + admin (presentation only — no logic changes)
- `src/routes/dashboard.tsx`, `src/components/dashboard/*`, `src/components/VerificationBanner.tsx` — convert panels to bento tiles in the new palette; keep all existing data hooks, queries, and `isReady`/auth gating untouched.
- `src/routes/admin.tsx` — same tile language for stat cards and section panels; tabs restyled with sage underline.

### 7. Modals / misc
- `src/components/WelcomeModal.tsx`, `ExploreCities.tsx`, `MediaViewer.tsx`, `BackButton.tsx` — palette + radius pass to match.

## What I will NOT touch
- `src/lib/authContext.tsx` and the auth bug fix already landed — left as-is.
- `src/integrations/supabase/*` (auto-generated).
- Server functions, RLS, migrations, routes, queries, or data shapes.
- Business logic in dashboard/admin (only the visual shell changes).

## Verification
After implementation: run Playwright against `localhost:8080` to screenshot Home, Products, Sellers, Store, Dashboard, Admin, Auth at 1280px and 390px; compare hero/tile composition against the chosen v3 prototype; check console for errors.

## Database / Supabase changes
**None.** This is a pure presentation pass.

Approve and I'll start with the design tokens + root font wiring, then ship the homepage, then sweep the remaining routes.