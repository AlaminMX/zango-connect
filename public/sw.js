const VERSION = "zango-pwa-v1";
const APP_SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;
const FONT_CACHE = `${VERSION}-fonts`;
const APP_SHELL = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192x192.svg",
  "/icons/icon-512x512.svg",
  "/icons/maskable-icon-512x512.svg",
  "/apple-touch-icon.svg"
];
const MAX_RUNTIME_ENTRIES = 80;
const MAX_IMAGE_ENTRIES = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) await cache.delete(keys[0]);
}

function isApiRequest(url) {
  return url.pathname.includes("/api/") || url.hostname.includes("supabase.co") || url.pathname.includes("/.netlify/functions/");
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && request.method === "GET") cache.put(request, response.clone());
    await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || caches.match("/offline.html");
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cacheName, maxEntries);
    }
    return response;
  }).catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (isApiRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (["style", "script", "worker", "font"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request, request.destination === "font" ? FONT_CACHE : RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
  }
});
