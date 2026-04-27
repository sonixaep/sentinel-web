/* public/sw.js */
const CACHE_NAME = "sentinel-v1";

const PRECACHE_URLS = [
  "/",
  "/targets",
  "/alerts",
  "/settings",
  "/setup",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip cross-origin requests (user's selfbot API, CDNs not whitelisted, etc.)
  if (url.origin !== self.location.origin) return;

  // 2. Skip non-GET requests
  if (request.method !== "GET") return;

  // 3. Next.js static chunks → cache-first with background refresh
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 4. Next.js image optimisation routes → network only
  if (url.pathname.startsWith("/_next/image")) return;

  // 5. Static assets (icons, fonts, etc.) → cache-first
  if (/\.(ico|png|svg|webp|woff2?|ttf|eot)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // 6. Page navigations → network-first, fall back to cached "/" (app shell)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then(
          (r) => r ?? new Response("Offline – please check your connection.", { status: 503 })
        )
      )
    );
    return;
  }
});