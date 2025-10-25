// service-worker.js

const CACHE_NAME = "other-eyes-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./script.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdn.tailwindcss.com"  // tailwind CDN
];

// Install: cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate: cleanup old caches if you version later
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch: try cache first, then network
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only GET requests are cacheable
  if (req.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(req).then((netRes) => {
        // Optional: runtime cache new GETs
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(req, netRes.clone());
          return netRes;
        });
      });
    })
  );
});
