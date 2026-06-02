const CACHE = 'offlinearcade-v83';

// Essenzielle App-Shell Dateien (SW schlägt fehl, wenn diese nicht geladen werden können)
const ESSENTIAL_ASSETS = [
  './',
  'index.html',
  'style.css',
  'main.js',
  'manifest.json',
  'multiplayer.js'
];

// Optionale Spiele-Assets (SW installiert sich trotzdem, falls eine Datei fehlt)
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

// Installation: Essentials cachen (muss gelingen) und Games optional cachen
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ESSENTIAL_ASSETS)
        .then(() => {
          return Promise.allSettled(
            GAME_ASSETS.map(url => {
              return cache.add(url).catch(err => {
                console.warn(`Optionales Pre-Caching übersprungen für: ${url}`, err);
              });
            })
          );
        });
    })
  );
});

// Aktivierung: Alten Cache bereinigen
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

// Fetch-Handler: Hybride Caching-Strategie
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(e.request.url);
  const isStaticAsset = url.pathname.includes('/games/') || url.pathname.includes('/assets/');

  if (isStaticAsset) {
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
