// Replaced in dist/sw.js by scripts/stamp-sw.mjs with the git commit.
const CACHE = 'gusto-__GUSTO_BUILD__'
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './splash-iphone.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL)),
  )
  // A first install has nothing to replace and activates at once. An update waits: the page
  // asks for it only when it is hidden, so an open page never swaps or reloads under the reader.
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
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
  // Hashed chunks include the place and guide catalogs, so a visit caches them for offline.
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
      const shell = (await caches.match('./index.html')) || (await caches.match('./'))
      if (shell) return shell
      return new Response(
        '<!doctype html><title>Offline · Gusto&#39;s Guide</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#141f4d;color:#fffaf3;font-family:Georgia,serif;padding:2rem"><main><h1 style="font-size:3rem;font-style:italic;font-weight:400">You are offline.</h1><p>Open Gusto&#39;s Guide once while you are online. After that, the last pages stay on this phone.</p></main></body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
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
