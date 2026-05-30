const CACHE = 'offlinearcade-v71';

// Nur die App-Shell muss beim Start sicher installiert sein
const ESSENTIAL_ASSETS = [
  './',
  'index.html',
  'style.css',
  'main.js',
  'manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(ESSENTIAL_ASSETS);
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

// WICHTIG: Cacht ALLES was geladen wird - egal ob Spiel, Bild, Script, Audio etc.
// So werden beim Laden eines Spiels (manuell ODER per Download-Button) alle Assets gespeichert.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) {
    return;
  }

  const url = new URL(e.request.url);

  // Spiele-Assets und Thumbnails: Cache-First (sofortiges Laden offline)
  const isGameAsset = url.pathname.includes('/games/') || url.pathname.includes('/assets/');

  if (isGameAsset) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) {
          return cached;
        }
        // Nicht im Cache? Netzwerk holen und für später speichern
        return fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, copy));
          }
          return response;
        });
      })
    );
  } else {
    // App-Shell: Network-First (Updates werden sofort geladen)
    e.respondWith(
      fetch(e.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
  }
});
