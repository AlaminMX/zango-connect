# ZANGO PWA deployment notes

ZANGO ships a first-party Progressive Web App implementation from the public root.

## Required hosting behavior

- Serve `public/manifest.webmanifest` as `application/manifest+json` or `application/json`.
- Serve `public/sw.js` from the site origin root (`/sw.js`) so it can control the full `/` scope.
- Do not HTML-rewrite `/sw.js`, `/manifest.webmanifest`, `/offline.html`, `/icons/*`, or `/apple-touch-icon.svg`.
- Use HTTPS in production. Service workers and install prompts are only available on secure origins, except localhost during development.
- Keep generated Vite assets content-hashed and cacheable. The service worker versions its own runtime caches and removes old `zango-pwa-*` caches during activation.

## Runtime behavior

- App navigations use a network-first strategy with cached/offline fallback.
- Static scripts, styles, workers, and fonts use stale-while-revalidate caching.
- Images use stale-while-revalidate caching with a bounded image cache.
- API and Supabase requests intentionally bypass service-worker caching to avoid persisting sensitive or user-specific marketplace data.

## Validation checklist

Run a production build and test from a secure preview or deployed environment:

1. Confirm `/manifest.webmanifest`, `/sw.js`, `/offline.html`, `/icons/icon-512x512.svg`, and `/icons/maskable-icon-512x512.svg` return 200 responses.
2. Open Chrome DevTools > Application and verify the manifest is installable with 192px and 512px icons.
3. Verify the service worker controls the page after reload.
4. Toggle offline mode and confirm cached navigations or `/offline.html` appear instead of browser network errors.
5. Deploy a changed `public/sw.js` version and confirm the in-app update banner appears without interrupting the active session.
6. Test install flows on Android Chrome, desktop Chrome/Edge, and iOS Safari Add to Home Screen.
