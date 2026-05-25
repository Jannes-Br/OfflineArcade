const CACHE = 'offlinearcade-v61';

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
  
  '/OfflineArcade/assets/thumbnails/escape-road.png'


  
  
  '/OfflineArcade/games/drive-mad/index..html',
  
  '/OfflineArcade/assets/thumbnails/drive-mad.png'


  
  '/games/block-smasher/index.html',
  
  '/assets/thumbnails/block-smasher.png',




  '/games/tic-tac-toe/index.html',
    
  '/assets/thumbnails/tic-tac-toe.png',




  '/games/2048/index.html',
    
  '/assets/thumbnails/2048.png',



    
  '/OfflineArcade/games/pong/index.html',
    
  '/assets/thumbnails/pong.png',
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
