// public/sw.js
const CACHE = "meme-editor-cache-v1";
const OFFLINE_URL = "editor";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        OFFLINE_URL,
        "/styles.css",
        "/script.js",
        "/assets/Gravity Icon Dark.png",
        "/assets/Gravity Icon Light.png",
        "/assets/Gravity_Logo_Wordmark_Black.png",
        "/assets/Gravity_Logo_Wordmark_White.png",
        "/assets/Round Gradient Background.png",
        "/assets/Square Gradient Background.png",
        "/lib/gif.worker.js",
        "/lib/gif.js"
      ])
    )
  );
});

self.addEventListener("fetch", (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((cached) => cached || fetch(evt.request))
  );
});
