const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_NAME = `bpv-tracker-${VERSION}`;
const BASE = self.location.pathname.replace(/\/sw\.js$/, '/');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      BASE,
      `${BASE}index.html`,
      `${BASE}manifest.json`,
      `${BASE}favicon.svg`,
    ]))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(`${BASE}index.html`)));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match(`${BASE}index.html`);
          }
          return undefined;
        });
    })
  );
});
