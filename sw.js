// ============================================================
// COMENSOL SURVEY APP — Service Worker v1
// Offline mode: cache app shell + queue offline submissions
// ============================================================

var CACHE_NAME = "comensol-v8";
var APP_SHELL = [
  "/",
  "/index.html"
];

// ── Install: cache app shell ──
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: serve from cache, fallback to network ──
self.addEventListener("fetch", function(e) {
  // Only handle GET requests and same-origin
  if (e.request.method !== "GET") return;

  // Firebase requests — always try network, don't cache
  if (e.request.url.includes("firestore.googleapis.com") ||
      e.request.url.includes("firebase") ||
      e.request.url.includes("googleapis.com")) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        // Cache successful responses
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline fallback — return cached index.html
        return caches.match("/index.html");
      });
    })
  );
});

// ── Background Sync: process offline queue ──
self.addEventListener("sync", function(e) {
  if (e.tag === "comensol-sync") {
    e.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  // Signal all clients to retry offline queue
  var clients = await self.clients.matchAll();
  clients.forEach(function(client) {
    client.postMessage({ type: "SYNC_OFFLINE_QUEUE" });
  });
}
