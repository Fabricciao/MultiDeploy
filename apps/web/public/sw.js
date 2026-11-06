/* Service worker minimal : installation de l'application + page hors ligne. AUCUNE donnée métier n'est mise en cache
   (pages, API, fichiers privés passent toujours par le réseau) pour ne rien laisser sur un appareil partagé. */
const CACHE = "nh-shell-v2";
const SHELL = ["/offline.html", "/icons/icon-192.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || r.mode !== "navigate") return;
  e.respondWith(fetch(r).catch(() => caches.match("/offline.html")));
});
