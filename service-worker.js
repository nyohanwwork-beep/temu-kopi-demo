const CACHE = "temu-kopi-v2";
const CORE = [
  "./",
  "./index.html",
  "./src/styles/main.css",
  "./src/app.js",
  "./src/ui.js",
  "./src/data/ui-data.js",
  "./src/data/assets.js"
].map((path) => new URL(path, self.location).href);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match(new URL("./index.html", self.location).href))));
});
