const VERSION = "meetingmind-shell-v2";
const ASSETS = ["./", "./index.html", "./app.css", "./auth.css", "./app.js", "./auth.js", "./extras.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Network-first: new deploys reach users immediately; cache is the offline fallback.
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/api/")) return;
  event.respondWith(
    fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(VERSION).then(cache => cache.put(request, copy)); }
      return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match("./index.html")))
  );
});
