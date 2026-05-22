const CACHE = 'offlinearcade-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/main.js',
  '/manifest.json',
  // Spiel und Ordner:
  '/games/escape-road/index.html',
  '/games/escape-road/game.js',
  '/games/escape-road/style.css'
  // weitere Assets nicht vergessen!
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});
self.addEventListener('activate', e => {
  clients.claim();
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    )
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
