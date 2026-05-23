const CACHE = 'offlinearcade-v14';

const ASSETS = [

  '/OfflineArcade/',
  '/OfflineArcade/index.html',
  '/OfflineArcade/style.css',
  '/OfflineArcade/main.js',
  '/OfflineArcade/manifest.json',

  '/OfflineArcade/games/escape-road/index.html',
  '/OfflineArcade/games/escape-road/manifest.json',
  '/OfflineArcade/games/escape-road/script.js',
  '/OfflineArcade/games/escape-road/style.css',

  '/OfflineArcade/games/escape-road/icon-512.png',
  '/OfflineArcade/games/escape-road/icon.png',
];

self.addEventListener('install', e => {

  self.skipWaiting();

  e.waitUntil(

    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))

  );

});

self.addEventListener('activate', e => {

  clients.claim();

  e.waitUntil(

    caches.keys().then(keys =>

      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )

    )

  );

});

self.addEventListener('fetch', e => {

  e.respondWith(

    fetch(e.request)

      .then(res => {

        const copy = res.clone();

        caches.open(CACHE)
          .then(cache => cache.put(e.request, copy));

        return res;

      })

      .catch(() => caches.match(e.request))

  );

});
