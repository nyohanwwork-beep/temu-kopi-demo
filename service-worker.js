const CACHE = "temu-kopi-v5";
const CORE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/styles/main.css",
  "./src/app.js",
  "./src/ui.js",
  "./src/views/renderers.js",
  "./src/data/mock-data.js",
  "./src/data/ui-data.js",
  "./src/data/assets.js",
  "./src/lib/demo-operations.js",
  "./src/lib/demo-store.js",
  "./src/lib/domain/allocation.js",
  "./src/lib/domain/inventory.js",
  "./src/lib/domain/money.js",
  "./src/lib/domain/reports.js",
  "./src/lib/domain/shift.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
  "./assets/Spreadsheet_Operasional_Temu_Kopi_Lengkap.xlsx"
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
