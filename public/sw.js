const CACHE_NAME = 'bpv-tracker-v2';
const BASE = self.location.pathname.replace(/\/sw\.js$/, '/');

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        BASE,
        BASE + 'index.html',
        BASE + 'manifest.json',
        BASE + 'favicon.svg',
      ]);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for app assets, network-first for everything else
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // For navigation requests, always try network first (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(BASE + 'index.html'))
    );
    return;
  }

  // For assets, try cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match(BASE + 'index.html');
        }
      });
    })
  );
});
