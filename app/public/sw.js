// EGO LIMITED engineer PWA — minimal service worker (network-first, cache fallback).
const CACHE = "ego-shell-v1"

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()))

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  // Don't cache the API.
  if (req.url.includes("/api/")) return
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
