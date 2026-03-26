// ═══════════════════════════════════════════════════════════════════
//  Cascos Update — Service Worker
//  Caches all app assets + XLSX CDN library for offline use
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'cascos-update-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './src/style.css',
  './src/app.js',
  './manifest.json',
  './public/icon.svg',
  './public/icon-192.png',
  './public/icon-512.png',
  './public/favicon.ico',
];

const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@300;400;500;600&display=swap',
];

// ── INSTALL: cache everything ────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache static assets (must succeed)
      await cache.addAll(STATIC_ASSETS);

      // Cache CDN assets (best-effort)
      for (const url of CDN_ASSETS) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn('[SW] Could not cache CDN asset:', url, e.message);
        }
      }
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: clean old caches ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: cache-first for app, network-first for CDN ───────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET
  if (event.request.method !== 'GET') return;

  // Network-first for CDN (fonts, xlsx lib) — fallback to cache
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for local assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return response;
      });
    })
  );
});
