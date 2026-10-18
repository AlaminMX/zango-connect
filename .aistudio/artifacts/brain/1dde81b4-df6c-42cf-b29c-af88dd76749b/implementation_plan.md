# Implementation Plan - Product Card Studio Vignette & WhatsApp Square View Fixes

## Problem Statement & Requirements
1. **Full-Bleed Frosted Glass Vignette Brightness**: Currently, the vignette/gradient overlay on Full-Bleed Frosted Glass makes the background and product image too dark/dim. We need to reduce the dark vignette opacity/intensity so the product image stands out brightly and clearly.
2. **Square WhatsApp View Alignment & Safe Zones**: In the square view (WhatsApp / Instagram export), elements like the WhatsApp number and QR code previously clipped or dropped off the edge. We need to establish robust safe-zone padding and auto-scaling to ensure 100% alignment fidelity between the live preview and the downloaded image.
3. **Full Product Visibility**: Guarantee that the full product image is fully visible across all export aspect ratios (square, portrait, story) without being cropped or obscured.

## Proposed Changes

### 1. Product Card Canvas & Export (`src/components/product-card-studio/ProductCardCanvas.tsx` & helpers)
- **Vignette Adjustment**: Update the Full-Bleed Frosted Glass gradient/vignette style (e.g. reducing heavy dark radial/linear gradients from black/90 to lighter warm/neutral glass overlays, e.g. `bg-black/30` or soft ambient blur with `from-black/20 via-transparent to-black/30`) so the product is brightly illuminated.
- **Square View Safe Zones & Padding**:
  - Implement a dedicated aspect-ratio / square mode layout container with guaranteed inner padding (e.g. `p-6` or `p-8` depending on square dimension) and flex/grid space allocation.
  - Position WhatsApp badge, QR code, title, price, and CTA within clear safe zones with absolute/relative bounding boxes that never exceed the canvas boundary.
- **Full Product Visibility**: Ensure image framing uses `object-contain` or bounded aspect ratio container so no part of the product is cropped in square or hero frames.

### 2. Product Card Studio Dialog (`src/components/product-card-studio/ProductCardStudioDialog.tsx`)
- Ensure preview rendering and download canvas export share identical dimensions, padding rules, and overlay calculations so what you see in preview is exactly what you download.

## Verification Plan
- Run `compile_applet` to verify compilation.
- Test preview modes in the UI:
  - Verify Full-Bleed Frosted Glass has vibrant, clear product visibility with a light subtle vignette.
  - Verify WhatsApp square view export correctly bounds the QR code, WhatsApp number, and footer elements inside the card without clipping.
