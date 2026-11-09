// Replaced in dist/sw.js by scripts/stamp-sw.mjs with GUSTO_BUILD_SHA, or git rev-parse HEAD.
const CACHE = 'gusto-__GUSTO_BUILD__'

// True only when this install is replacing a worker that is already controlling a page.
let replaceOpenClients = false

self.addEventListener('install', (event) => {
  // Read this before skipWaiting. Fetching the shell here deadlocks install: the previous
  // worker still owns the page, and the new one never leaves "installing".
  replaceOpenClients = Boolean(self.registration.active)
  self.skipWaiting()
  event.waitUntil(Promise.resolve())
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
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
      if (replaceOpenClients) {
        const open = await self.clients.matchAll({ type: 'window' })
        for (const client of open) {
          if (typeof client.navigate !== 'function') continue
          let next
          try {
            next = new URL(client.url)
          } catch {
            continue
          }
          // Same-URL navigate can restore the old document. A one-time query forces a real load
          // and leaves the hash, so the open guide or place stays put. The page removes the query.
          // Do not await navigate: the new document cannot finish loading until activate's
          // waitUntil resolves, and awaiting it here would wait forever.
          if (next.searchParams.get('gusto-build') === CACHE) continue
          next.searchParams.set('gusto-build', CACHE)
          client.navigate(next.href).catch(() => {})
        }
      }
    })(),
  )
})

function isHashedAsset(url) {
  // Hashed chunks include the place and guide catalogs, so a visit caches them for offline.
  return url.pathname.includes('/assets/')
}

function mustRevalidate(url, request) {
  // status.js is the unhashed bootloader. Pages was caching it for four hours, so a reload
  // kept the previous entry chunk. Bypass the HTTP cache for the document and the boot files.
  if (request.mode === 'navigate') return true
  return (
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/status.js') ||
    url.pathname.endsWith('/cfa.js') ||
    url.pathname.endsWith('/hop.js') ||
    url.pathname.endsWith('/manifest.webmanifest')
  )
}

const RELOAD_MODULE = `try{if(sessionStorage.getItem('gusto-chunk-reload')==='1'){sessionStorage.removeItem('gusto-chunk-reload')}else{sessionStorage.setItem('gusto-chunk-reload','1');location.reload()}}catch(e){}export{}\n`

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
    return response
  }
  const url = new URL(request.url)
  // A shell from the previous deploy asks for a hashed chunk this deploy removed.
  // Hand back a module that reloads once onto the current build instead of a blank route.
  if (response.status === 404 && url.pathname.includes('/assets/') && url.pathname.endsWith('.js')) {
    return new Response(RELOAD_MODULE, {
      status: 200,
      headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' },
    })
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

async function fetchFresh(request) {
  const url = new URL(request.url)
  // A new fetch() from this handler is intercepted again and never returns. Pass the original
  // navigation through. Mark boot scripts so the handler lets those reach the network.
  if (!mustRevalidate(url, request) || request.mode === 'navigate') return fetch(request)
  const headers = new Headers()
  headers.set('x-gusto-fresh', '1')
  return fetch(request.url, { cache: 'reload', credentials: 'same-origin', redirect: 'follow', headers })
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetchFresh(request)
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
  if (request.headers.get('x-gusto-fresh') === '1') return
  const url = new URL(request.url)
  if (url.hostname === 'tiles.openfreemap.org' && (url.pathname === '/planet' || /\/(styles|sprites|fonts)\//.test(url.pathname))) {
    event.respondWith(cacheFirst(request))
    return
  }
  if (url.origin !== self.location.origin) return
  if (isWorkerScript(url)) {
    event.respondWith(fetch(request))
    return
  }
  event.respondWith(isHashedAsset(url) ? cacheFirst(request) : networkFirst(request))
})
