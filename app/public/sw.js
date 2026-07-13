// EGO LIMITED engineer PWA — service worker.
//
// v3: the app now OPENS OFFLINE. v2 made navigations network-only, which meant an engineer who
// closed the app in a basement could not reopen it at all — and an offline outbox is worthless if
// the app it lives in won't start without signal. That is the whole point of the feature.
//
// The history matters, because the obvious fix is the one that broke production before:
//   - v1 was CACHE-FIRST for navigations. A deploy's `rsync --delete` removed the old hashed JS,
//     but browsers kept serving the cached index.html that pointed at it → 404 → React never
//     mounted → site-wide white screen (2026-07-08). The shell was fine over curl; only real
//     browsers holding the stale SW cache were broken, which is why it took days to spot.
//   - v2 over-corrected to NETWORK-ONLY: correct, but the app then cannot start offline.
//   - v3 is NETWORK-FIRST WITH A CACHE FALLBACK. When the network works — which includes every
//     deploy — the browser always gets the fresh index.html, so a stale shell can never win.
//     The cached copy is used *only* when the network genuinely cannot be reached.
//
// The failure mode this leaves is narrow and acceptable: an engineer who is offline immediately
// after a deploy could load a cached shell whose hashed assets are gone. They'd see the error
// boundary (not a white screen), and a reload with signal fixes it. That is a far smaller harm
// than losing a day's fieldwork because the app wouldn't open in a plant room.
const CACHE = "ego-shell-v4"
const SHELL = "index.html"

// skipWaiting on install: a fix must not wait for every tab in the building to be closed.
self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("message", (e) => { if (e.data === "skip-waiting") self.skipWaiting() })
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
)

self.addEventListener("fetch", (e) => {
  const req = e.request
  if (req.method !== "GET") return
  if (req.url.includes("/api/")) return // never cache the API — stale job data is worse than none

  // The HTML shell: always try the network first, and keep the last good copy so the engineer can
  // still open the app with no signal.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(SHELL, copy)).catch(() => {})
          return res
        })
        .catch(() =>
          // Genuinely offline. Serve the last shell we saw. Any route works: the SPA router reads
          // the URL on boot, so /ego/engineer/job?id=1 resolves correctly from the cached index.
          caches.open(CACHE).then((c) => c.match(SHELL))
        )
    )
    return
  }

  // Content-hashed assets: a hash never changes meaning, so caching them is always safe.
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
