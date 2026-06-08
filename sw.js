const CACHE = 'offlinearcade-v97';

// Essential App Shell files (SW fails if these cannot be loaded)
const ESSENTIAL_ASSETS = [
  './',
  'index.html',
  'style.css',
  'main.js',
  'manifest.json',
  'multiplayer.js'
];

// Optional game assets (SW still installs if a file is missing)
const GAME_ASSETS = [
  'games/escape-road/index.html',
  'games/escape-road/manifest.json',
  'games/escape-road/script.js',
  'games/escape-road/style.css',
  'games/escape-road/icon-512.png',
  'games/escape-road/icon.png',
  'assets/thumbnails/escape-road.png',

  'games/drive-mad/index.html',
  'assets/thumbnails/drive-mad.png',

  'games/block-smasher/index.html',
  'assets/thumbnails/block-smasher.png',

  'games/tic-tac-toe/index.html',
  'assets/thumbnails/tic-tac-toe.png',

  'games/2048/index.html',
  'assets/thumbnails/2048.png',

  'games/pong/index.html',
  'assets/thumbnails/pong.png'
];

// Installation: Cache essentials (must succeed) and cache games optionally
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      // 1. Load essential shell files
      return cache.addAll(ESSENTIAL_ASSETS)
        .then(() => {
          // 2. Cache optional game assets individually so errors (404) do not block installation
          return Promise.allSettled(
            GAME_ASSETS.map(url => {
              return cache.add(url).catch(err => {
                console.warn(`Optional pre-caching skipped for: ${url}`, err);
              });
            })
          );
        });
    })
  );
});

// Activation: Clean up old cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Handler: Hybrid caching strategy
self.addEventListener('fetch', e => {
  // Only handle HTTP/HTTPS GET requests
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(e.request.url);
  // Detect static game assets and thumbnails
  const isStaticAsset = url.pathname.includes('/games/') || url.pathname.includes('/assets/');

  if (isStaticAsset) {
    // A. CACHE-FIRST for game assets (loads offline & online instantly from cache)
    e.respondWith(
      caches.match(e.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(e.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE).then(cache => {
              cache.put(e.request, copy);
            });
          }
          return networkResponse;
        });
      })
    );
  } else {
    // B. NETWORK-FIRST for the App Shell (ensures updates are fetched)
    e.respondWith(
      fetch(e.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE).then(cache => {
              cache.put(e.request, copy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(e.request);
        })
    );
  }
});
