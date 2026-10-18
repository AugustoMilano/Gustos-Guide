const CACHE = 'gusto-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['./', './index.html', './manifest.webmanifest'])).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((response) => {
          if (response.ok && new URL(request.url).origin === self.location.origin) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          }
          return response
        })
        .catch(() => caches.match('./index.html'))
    }),
  )
})
