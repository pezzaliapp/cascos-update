// ═══════════════════════════════════════════════════════════════════
//  Cascos Update — Service Worker
//  Caches all app assets + XLSX CDN library for offline use
// ═══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'cascos-update-v2';

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

// ── FETCH: network-first for local files, network-first for CDN ──
// Network-first ensures updated files are always served immediately.
// Cache is only used as fallback when offline.
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // Network-first for everything: try network, update cache, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache valid responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
