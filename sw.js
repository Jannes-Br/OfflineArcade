const CACHE='offlinearcade-v2'; // Bei echten Änderungen hochzählen!
const ASSETS=[
  'index.html','style.css','main.js','manifest.json',
  'games/escape-road/index.html',
  'games/escape-road/game.js',
  'games/escape-road/style.css'
  // ggf. weitere Assets hier ergänzen!
];

// Message-Handler für SkipWaiting bei Update
self.addEventListener('message',event=>{
  if(event.data && event.data.type==='SKIP_WAITING'){self.skipWaiting();}
});

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('activate',e=>{
  clients.claim();
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
  );
});
self.addEventListener('fetch',e=>{
  e.respondWith(
    caches.match(e.request).then(res=>res||fetch(e.request))
  );
});
