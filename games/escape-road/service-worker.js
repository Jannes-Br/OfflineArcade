const CACHE_NAME = "escape-road-offline-v2";
const OFFLINE_URL = new URL("./index.html", self.location.href).href;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./escape-road-icon-192.png",
  "./escape-road-icon-512.png",
  "https://cdn.jsdelivr.net/gh/abisdbest/classroom.google.com@85146ac051b67a3c32ebdf898bb0144d818d580b/drive.google.com/escape%20road/TemplateData/style.css",
  "https://cdn.jsdelivr.net/gh/abisdbest/classroom.google.com@85146ac051b67a3c32ebdf898bb0144d818d580b/drive.google.com/escape%20road/TemplateData/data.unityweb",
  "https://cdn.jsdelivr.net/gh/abisdbest/classroom.google.com@85146ac051b67a3c32ebdf898bb0144d818d580b/drive.google.com/escape%20road/TemplateData/wasm.unityweb",
  "https://cdn.jsdelivr.net/gh/abisdbest/classroom.google.com@85146ac051b67a3c32ebdf898bb0144d818d580b/drive.google.com/escape%20road/loading.png",
  "https://cdn.jsdelivr.net/gh/abisdbest/classroom.google.com@85146ac051b67a3c32ebdf898bb0144d818d580b/drive.google.com/escape%20road/car-icon.png",
  "https://cdn.jsdelivr.net/gh/abisdbest/classroom.google.com@85146ac051b67a3c32ebdf898bb0144d818d580b/drive.google.com/escape%20road/az_logo.png",
  "https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics-compat.js",
  "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.9.0/firebase-analytics.js",
  "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js",
  "https://www.google.com/jsapi",
  "https://public.codepenassets.com/embed/index.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(PRECACHE_URLS.map(async (url) => {
      try {
        const resolvedUrl = new URL(url, self.location.href);
        const request = new Request(resolvedUrl.href);
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") {
          await cache.put(resolvedUrl.href, response);
        }
      } catch (error) {
        console.warn("Failed to cache:", url, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.protocol !== "http:" && requestUrl.protocol !== "https:") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const networkResponse = await fetch(event.request);
        cache.put(OFFLINE_URL, networkResponse.clone());
        return networkResponse;
      } catch (error) {
        console.warn("Navigation fetch failed:", error);
        return (await cache.match(event.request)) || (await cache.match(OFFLINE_URL));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = (await cache.match(event.request)) || (await cache.match(requestUrl.href));
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(event.request);
      if (networkResponse.ok || networkResponse.type === "opaque") {
        cache.put(requestUrl.href, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      return Response.error();
    }
  })());
});
