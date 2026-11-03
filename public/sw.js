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
  if (event.data && event.data.type === 'CACHE_URLS' && Array.isArray(event.data.urls)) {
    event.waitUntil(
      caches.open(CACHE).then((cache) =>
        Promise.all(
          event.data.urls.slice(0, 200).map(async (href) => {
            const url = new URL(href, self.location.origin)
            if (url.origin !== self.location.origin || (await cache.match(url))) return
            const response = await fetch(url)
            if (response.ok) await cache.put(url, response)
          }),
        ).catch(() => {}),
      ),
    )
  }
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

// Photos are the heavy part of an offline copy. Keep the most recent ones only (C4).
const PHOTO_LIMIT = 160
async function trimPhotos(cache) {
  const keys = (await cache.keys()).filter((key) => new URL(key.url).pathname.startsWith('/photos/'))
  if (keys.length <= PHOTO_LIMIT) return
  await Promise.all(keys.slice(0, keys.length - PHOTO_LIMIT).map((key) => cache.delete(key)))
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
      if (new URL(request.url).pathname.startsWith('/photos/')) trimPhotos(cache).catch(() => {})
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    if (request.mode === 'navigate') {
      const shell = (await caches.match('./index.html')) || (await caches.match('./'))
      if (shell) return shell
      return new Response(
        '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fffaf3"><title>Offline · Gusto&#39;s Guide</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fffaf3;color:#181818;font-family:Georgia,serif;padding:24px;box-sizing:border-box"><main style="max-width:32rem"><p style="margin:0;font:700 12px/1.2 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase">Gusto&#39;s Guide</p><h1 style="margin:8px 0 0;font-size:48px;font-style:italic;font-weight:400;line-height:1">You are offline.</h1><p style="margin:16px 0 0;font:16px/1.5 system-ui,sans-serif">Open Gusto&#39;s Guide once with a connection. After that, the guides and places you open stay on this device.</p><p style="margin:24px 0 0"><button onclick="location.reload()" style="min-height:44px;padding:0 16px;border:2px solid #181818;border-radius:999px;background:#fffaf3;font:600 16px system-ui,sans-serif;color:#181818">Try again</button></p></main></body></html>',
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
