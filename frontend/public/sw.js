// public/sw.js
const CACHE_NAME   = "meme-editor-cache-v1";
const OFFLINE_PAGE = "/editor";

// List of resources to cache on install
const ASSETS = [
  OFFLINE_PAGE,
  "/styles.css",
  "/script.js",
  "/lib/gif.js",
  "/lib/gif.worker.js",
  "/assets/Gravity%20Icon%20Dark.png",
  "/assets/Gravity%20Icon%20Light.png",
  "/assets/Gravity_Logo_Wordmark_Black.png",
  "/assets/Gravity_Logo_Wordmark_White.png",
  "/assets/Round%20Gradient%20Background.png",
  "/assets/Square%20Gradient%20Background.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  // Clean up old caches if you ever change CACHE_NAME
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(oldKey => caches.delete(oldKey))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;

  // Always serve the offline page for navigations when offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_PAGE)
      )
    );
    return;
  }

  // For other requests, try cache first, then network
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request)
    )
  );
});
