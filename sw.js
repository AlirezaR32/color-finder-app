/**
 * sw.js — minimal app-shell service worker for رنگ‌یاب (Color Finder)
 * Caches the static shell so the app still opens (camera permission
 * notwithstanding) without a network connection after the first visit.
 */
const CACHE_NAME = "color-finder-v3";
const ASSETS = [
  "./index.html",
  "./css/styles.css",
  "./js/colors.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  // cache.add() per file (via allSettled) instead of cache.addAll():
  // addAll() is all-or-nothing — one failed asset would abort the whole
  // install and leave the app with zero offline support.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // let Google Fonts hit the network normally

  // Any page navigation (opening the installed app, refreshing, etc.)
  // always falls back to the cached app shell when offline/network fails.
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then((cached) => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
