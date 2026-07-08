// EGO LIMITED engineer PWA — minimal service worker.
// v2: navigations (index.html) are NETWORK-ONLY, never cached, never served from a
// fallback. A stale cached index.html pointing at a hashed JS/CSS file that a later
// deploy's `rsync --delete` removed is exactly what caused the white-screen incident
// (2026-07-08) — the shell loaded fine over curl/HTTP but a browser holding an old
// SW-cached page 404'd on its JS and React never mounted. Only content-hashed static
// assets (safe to cache indefinitely — a hash never changes meaning) get the
// network-first-with-cache-fallback treatment now.
const CACHE = "ego-shell-v2"

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) =>
  e.waitUntil(
    // Drop every previous cache (including v1) on activate — no carried-over stale entries.
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
)

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  if (req.url.includes("/api/")) return // never cache the API

  // Navigations (the HTML shell) must always be current — no cache read or write.
  // This is what stops a stale index.html from ever surviving a deploy.
  if (req.mode === "navigate") { e.respondWith(fetch(req)); return }

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        return res
      })
      .catch(() => caches.match(req))
  )
})
