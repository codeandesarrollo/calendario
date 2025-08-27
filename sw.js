/* sw.js – Calendario PWA */
const APP_CACHE = "calendario-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest"
  // Nota: tu CSS/JS están inlined en index.html. Si separas assets, añádelos aquí.
];

// Activación rápida en actualizaciones
self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(APP_CACHE).then((c) => c.addAll(APP_SHELL)));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === APP_CACHE ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

// Estrategias básicas:
// - Misma-origen: cache-first (app shell)
// - Google Fonts/otros orígenes: network-first con fallback a caché
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Solo GET
  if (req.method !== "GET") return;

  // Misma-origen: cache first
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(APP_CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  // Terceros (fonts, imágenes remotas): network first
  e.respondWith((async () => {
    const cache = await caches.open(APP_CACHE);
    try {
      const res = await fetch(req, { mode: "no-cors" });
      cache.put(req, res.clone());
      return res;
    } catch {
      const hit = await cache.match(req);
      if (hit) return hit;
      // Fallback mínimo
      return new Response("", { status: 504, statusText: "Offline" });
    }
  })());
});
