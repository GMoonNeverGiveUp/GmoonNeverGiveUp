// public/sw.js
const CACHE = "meme-editor-cache-v1";
const OFFLINE_URL = "/editor";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        OFFLINE_URL,
        "/styles.css",
        "/script.js",
        "Gravity Icon Dark.png",
        "Gravity Icon Light.png",
        "Gravity_Logo_Wordmark_Black.png",
        "Gravity_Logo_Wordmark_White.png",
        "Round Gradient Background.png",
        "Square Gradient Background.png"
      ])
    )
  );
});

self.addEventListener("fetch", (evt) => {
  evt.respondWith(
    caches.match(evt.request).then((cached) => cached || fetch(evt.request))
  );
});
