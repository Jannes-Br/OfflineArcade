const CACHE = 'offlinearcade-v78';

const ESSENTIAL_ASSETS = [
  './',
  'index.html',
  'style.css',
  'main.js',
  'manifest.json',
  'multiplayer.js',
  'assets/qrcode.min.js',
  'assets/jsqr.min.js'
];

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

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ESSENTIAL_ASSETS).then(() => {
        return Promise.allSettled(
          GAME_ASSETS.map(url => cache.add(url).catch(err => {
            console.warn(`Optionales Pre-Caching übersprungen: ${url}`, err);
          }))
        );
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE && caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;
  const url = new URL(e.request.url);
  const isStaticAsset = url.pathname.includes('/games/') || url.pathname.includes('/assets/');

  if (isStaticAsset) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }))
    );
  } else {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
