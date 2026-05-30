const CACHE = 'offlinearcade-v69';

const ASSETS = [
  './',
  'index.html',
  'style.css',
  'main.js',
  'manifest.json',

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
      return cache.addAll(ASSETS);
    })
  );
});

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

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => {
            cache.put(e.request, copy);
          });
        }
        return res;
      })
      .catch(() => {
        return caches.match(e.request);
      })
  );
});
