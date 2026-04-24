// Tipo di service worker — network-first for same-origin requests.
// Effect: every PWA launch fetches the latest HTML from GitHub Pages
// when online, and falls back to the last cached copy when offline.

const CACHE = 'tipodi-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Drop any stale caches from earlier iterations
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Don't touch cross-origin requests — Supabase, Wiktionary,
  // MyMemory, frequency list, etc. The browser handles those normally.
  if (url.origin !== self.location.origin) return;

  // GET only; ignore POSTs, HEADs, etc.
  if (req.method !== 'GET') return;

  e.respondWith((async () => {
    try {
      const net = await fetch(req, { cache: 'no-store' });
      if (net && net.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
      }
      return net;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      return new Response('Offline and no cached copy.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  })());
});

// Allow the page to request an immediate activate on new install.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
