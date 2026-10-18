// Replaced in dist/sw.js by scripts/stamp-sw.mjs with the git commit.
const CACHE = 'gusto-__GUSTO_BUILD__'
const SHELL = ['./', './index.html', './manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

function isHashedAsset(url) {
  return url.pathname.includes('/assets/')
}

function isWorkerScript(url) {
  return url.pathname === '/sw.js' || url.pathname.endsWith('/sw.js')
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const copy = response.clone()
    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
  }
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.mode === 'navigate') {
      const shell = await caches.match('./index.html')
      if (shell) return shell
    }
    return Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isWorkerScript(url)) {
    event.respondWith(fetch(request))
    return
  }
  event.respondWith(isHashedAsset(url) ? cacheFirst(request) : networkFirst(request))
})
