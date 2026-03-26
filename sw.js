// Comensol Survey App - Service Worker v26MAR26
// Network First strategy - always get fresh content

var CACHE_NAME = 'comensol-v26MAR26';
var OFFLINE_URL = '/index.html';

self.addEventListener('install', function(e) {
  self.skipWaiting(); // Activate immediately
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([OFFLINE_URL]);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    // Delete ALL old caches
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim(); // Take control immediately
    })
  );
});

self.addEventListener('fetch', function(e) {
  // For HTML files - always network first
  if (e.request.mode === 'navigate' || e.request.url.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }
  // For API calls - always network
  if (e.request.url.includes('firestore') || e.request.url.includes('firebase')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // For other assets - cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        return response;
      });
    })
  );
});
