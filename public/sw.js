// public/sw.js
const CACHE = "meme-editor-cache-v1";
const OFFLINE_URL = "editor";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        OFFLINE_URL,
        "public/styles.css",
        "public/script.js",
        "public/assets/Gravity Icon Dark.png",
        "public/assets/Gravity Icon Light.png",
        "public/assets/Gravity_Logo_Wordmark_Black.png",
        "public/assets/Gravity_Logo_Wordmark_White.png",
        "public/assets/Round Gradient Background.png",
        "public/assets/Square Gradient Background.png",
        "public/lib/gif.worker.js",
        "public/lib/gif.js"
      ])
    )
  );
});

self.addEventListener("fetch", (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((cached) => cached || fetch(evt.request))
  );
});
