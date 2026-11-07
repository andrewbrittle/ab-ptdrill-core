// Service worker for Português Drill - registered by the app itself (see
// syncServiceWorkerRegistration() in index.html).
//
// Strategy: network-first, cache-fallback, for every GET request. Online
// users always get the freshest version; the cache is only used when the
// network request actually fails, i.e. genuinely offline.
//
// IMPORTANT: bump CACHE_VERSION every time the app's own version stamp (in
// index.html) is bumped, so old cached files get cleared out.
//
// The prefix is 'pt-drill-' (not the Japanese apps' 'jp-drill-') on purpose:
// on activate this deletes every OTHER cache with its own prefix, and apps
// published under the same github.io address share one cache store - a
// shared prefix would let this app wipe the Japanese apps' offline copies.
const CACHE_VERSION = 'pt-core-v261105-001-2611070843';

const PRECACHE_URLS = [
  './',
  './index.html',
  './vocab.js',
  './grammar.js',
  './pt/app.js',
  './core/core.js',
  './core/questions.js',
  './pt/sounds.js',
  './pt/verbs.js',
  './pt/grammar-screen.js',
  './pt/numbers.js',
  './pt/greeting.js',
  './pt/sentences.js',
  './pt/desk-sheets.js',
  './pt/builder.js',
  './core/start.js',
  './lang/pt.js',
  './instructions.html',
  './changelog.html',
  './manifest-pt.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // One at a time, so a single missing asset can't stop the rest caching.
      Promise.all(
        // cache: 'reload' (2026-10-24) - fetch past the browser's own HTTP
        // cache. GitHub Pages lets browsers keep files for 10 minutes, so a
        // plain add() straight after a release could store the OLD files
        // under the new version's name.
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {}))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((name) => name.startsWith('pt-core-') && name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// Network-first still means "wait for the network" by default, and a
// connection that's merely slow/lossy (weak signal on a train, one bar in a
// station) rather than cleanly offline can leave a plain fetch() hanging for
// a long time before the browser's own timeout gives up and lets the catch()
// below run. Racing every fetch against a short timeout means a bad-but-not-
// dead connection still falls back to the cached version quickly, instead of
// the app just sitting there loading.
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Our own files are always checked with GitHub (cache: 'no-cache',
  // 2026-10-24): GitHub Pages lets the browser reuse a file for 10 minutes
  // without asking, which kept an old version showing after a release.
  // When nothing has changed the check is a tiny "not modified" reply.
  const sameOrigin = new URL(event.request.url).origin === self.location.origin;
  const networkFetch = (sameOrigin ? fetch(event.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(event.request)).then((response) => {
    // Only cache genuinely successful responses. Opaque cross-origin
    // responses (status 0) are also cached best-effort - the Google
    // Font request falls in this category on some browsers - since a
    // stale font is a much smaller problem than a missing one offline.
    if (response && (response.ok || response.type === 'opaque')) {
      const copy = response.clone();
      caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy)).catch(() => {});
    }
    return response;
  });
  // If the timeout below wins the race, this fetch is still left running in
  // the background (not cancelled) so a slow-but-eventually-successful
  // response still updates the cache for next time. That means it can go on
  // to reject on its own after the race is already settled - swallow that
  // here so it doesn't show up as an unhandled rejection; the user's already
  // been served from cache by then.
  networkFetch.catch(() => {});

  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('network-timeout')), NETWORK_TIMEOUT_MS);
  });

  event.respondWith(
    Promise.race([networkFetch, timeout]).catch(() => caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      // No exact match cached - if this was a page navigation (not an
      // image/font/etc.), fall back to the cached app shell rather than
      // showing the browser's own offline error page.
      if (event.request.mode === 'navigate') return caches.match('./index.html').then((shell) => shell || networkFetch);
      // Nothing cached for it (2026-10-25): keep waiting for the network
      // rather than failing - a slow connection used to give "the word list
      // didn't load" when the network was fine, just slower than 3 seconds.
      return networkFetch;
    }))
  );
});
