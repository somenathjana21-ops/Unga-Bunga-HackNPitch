// WANT Cache-First Static Asset Service Worker.
// Keeps sprites, backgrounds, WAV audio, and built bundles snappy and resilient
// against network fluctuations, while never interfering with Vite dev/HMR routes.

const CACHE_NAME = 'want-static-v1';

const DEV_BYPASS_PREFIXES = [
  '/@vite',
  '/@fs',
  '/__vite',
  '/node_modules/',
  '/src/',
];

function shouldBypass(url) {
  if (url.origin !== self.location.origin) return true;
  if (DEV_BYPASS_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return true;
  if (url.pathname.endsWith('.ts') || url.pathname.endsWith('.tsx')) return true;
  return false;
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith('/assets/')
    || pathname.endsWith('.png')
    || pathname.endsWith('.wav')
    || pathname.endsWith('.webp')
    || pathname.endsWith('.woff2')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (shouldBypass(url)) return;

  // Cache-first for all game art, audio, and built asset bundles (0ms network wait once cached).
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const response = await fetch(req);
          if (response && response.ok && response.status === 200) {
            cache.put(req, response.clone()).catch(() => { /* ignore quota limits */ });
          }
          return response;
        } catch (err) {
          const fallback = await cache.match(req);
          if (fallback) return fallback;
          throw err;
        }
      }),
    );
    return;
  }

  // Network-first with fast cache fallback for document navigations.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) {
            cache.put(req, fresh.clone()).catch(() => { /* ignore */ });
          }
          return fresh;
        } catch {
          const cached = await cache.match(req);
          if (cached) return cached;
          return new Response('Offline — please reconnect once to cache WANT.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      }),
    );
  }
});
