import { createServer, type ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const V1 = '1111111111111111111111111111111111111111'
const V2 = '2222222222222222222222222222222222222222'
const PORT = 4188
const ORIGIN = `http://127.0.0.1:${PORT}`

const oldWorker = `const CACHE = 'gusto-${V1}'
self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()) })
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(request))
    return
  }
  const hashed = url.pathname.includes('/assets/')
  event.respondWith((async () => {
    if (hashed) {
      const cached = await caches.match(request)
      if (cached) return cached
    }
    try {
      const response = await fetch(request)
      if (response.ok) {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
      }
      return response
    } catch {
      const cached = await caches.match(request)
      return cached || Response.error()
    }
  })())
})
`

const newWorker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8').replaceAll('__GUSTO_BUILD__', V2)

let version: 'v1' | 'v2' = 'v1'
const seen: string[] = []

const ROUTE = '/#/eastside/place/bis-on-main'

function html(boot: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Gusto</title></head><body>
<h1 id="hero">loading</h1><p id="dek"></p><p id="kept"></p><button id="guide" type="button">Open guide</button><p id="guide-text"></p>
<script src="${boot}"></script>
</body></html>`
}

function app(hero: string, dek: string, chunk: string) {
  return `try { var u = new URL(location.href); if (u.searchParams.has('gusto-build')) { u.searchParams.delete('gusto-build'); history.replaceState(history.state, '', u.pathname + u.search + u.hash) } } catch (e) {}
if (!localStorage.getItem('gusto-keep')) localStorage.setItem('gusto-keep', 'bis-on-main')
document.querySelector('#kept').textContent = localStorage.getItem('gusto-keep')
document.querySelector('#hero').textContent = ${JSON.stringify(hero)}
document.querySelector('#dek').textContent = ${JSON.stringify(dek)}
document.querySelector('#guide').addEventListener('click', () => {
  import(${JSON.stringify(chunk)}).then(() => {}, () => { document.querySelector('#guide-text').textContent = 'blank' })
})
navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
`
}

const files: Record<'v1' | 'v2', Record<string, { body: string; type: string; cache: string }>> = {
  v1: {
    '/': { body: html('./status.js'), type: 'text/html; charset=utf-8', cache: 'no-cache' },
    '/index.html': { body: html('./status.js'), type: 'text/html; charset=utf-8', cache: 'no-cache' },
    '/status.js': {
      body: `var s=document.createElement('script');s.type='module';s.src='/assets/app-old.js';document.head.appendChild(s)\n`,
      type: 'text/javascript; charset=utf-8',
      cache: 'max-age=14400',
    },
    '/sw.js': { body: oldWorker, type: 'text/javascript; charset=utf-8', cache: 'no-store' },
    '/assets/app-old.js': {
      body: app('Eat your way through Seattle.', 'From a 7am bun to the last good stool on Pike.', '/assets/GuidePage-CKgn3Vvk.js'),
      type: 'text/javascript; charset=utf-8',
      cache: 'no-store',
    },
    '/assets/GuidePage-CKgn3Vvk.js': {
      body: `document.querySelector('#guide-text').textContent = 'Pike Place old'\n`,
      type: 'text/javascript; charset=utf-8',
      cache: 'public, max-age=31536000, immutable',
    },
  },
  v2: {
    '/': { body: html(`./status.js?v=${V2}`), type: 'text/html; charset=utf-8', cache: 'no-cache' },
    '/index.html': { body: html(`./status.js?v=${V2}`), type: 'text/html; charset=utf-8', cache: 'no-cache' },
    '/status.js': {
      body: `var s=document.createElement('script');s.type='module';s.src='/assets/app-new.js';document.head.appendChild(s)\n`,
      type: 'text/javascript; charset=utf-8',
      cache: 'max-age=14400',
    },
    '/sw.js': { body: newWorker, type: 'text/javascript; charset=utf-8', cache: 'no-store' },
    '/assets/app-new.js': {
      body: app('Seattle', '', '/assets/GuidePage-NEW.js'),
      type: 'text/javascript; charset=utf-8',
      cache: 'no-store',
    },
    '/assets/GuidePage-NEW.js': {
      body: `document.querySelector('#guide-text').textContent = 'Pike Place'\n`,
      type: 'text/javascript; charset=utf-8',
      cache: 'public, max-age=31536000, immutable',
    },
  },
}

function send(res: ServerResponse, file: { body: string; type: string; cache: string }) {
  res.writeHead(200, { 'Content-Type': file.type, 'Cache-Control': file.cache })
  res.end(file.body)
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', ORIGIN)
  seen.push(url.pathname + url.search)
  const path = url.pathname === '/index.html' ? '/index.html' : url.pathname
  const key = path === '/status.js' ? '/status.js' : path
  const file = files[version][key]
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' })
    res.end('missing')
    return
  }
  send(res, file)
})

async function reset(page: Page) {
  await page.goto(ORIGIN + ROUTE, { waitUntil: 'commit' }).catch(() => {})
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.evaluate(async () => {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((reg) => reg.unregister()))
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      })
      break
    } catch {
      await page.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {})
    }
  }
  await page.goto(ORIGIN + ROUTE, { waitUntil: 'domcontentloaded' })
}

async function bootOld(page: Page) {
  version = 'v1'
  await reset(page)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('#hero')).toHaveText('Eat your way through Seattle.')
  await expect(page.locator('#dek')).toHaveText('From a 7am bun to the last good stool on Pike.')
  await expect(page.locator('#kept')).toHaveText('bis-on-main')
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null).catch(() => false), { timeout: 8000 }).toBe(true).catch(async () => {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null).catch(() => false), { timeout: 8000 }).toBe(true)
  })
}

async function expectKeptRoute(page: Page) {
  await expect(page).toHaveURL(/#\/eastside\/place\/bis-on-main/)
  await expect(page).not.toHaveURL(/gusto-build/)
  await expect(page.locator('#kept')).toHaveText('bis-on-main')
}

test.beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve))
})

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
})

for (const size of [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
] as const) {
  test.describe(size.name, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height })
    })

    test('a reload of the old shell shows the new boot, not the cached tagline', async ({ page }) => {
      await bootOld(page)
      version = 'v2'
      seen.length = 0
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.locator('#hero')).toHaveText('Seattle')
      await expect(page.locator('#dek')).toHaveText('')
      await expectKeptRoute(page)
      expect(seen.some((hit) => hit.startsWith(`/status.js?v=${V2}`))).toBe(true)
      await page.locator('#guide').click()
      await expect(page.locator('#guide-text')).toHaveText('Pike Place')
    })

    test('an open tab takes the new worker without a manual reload', async ({ page }) => {
      await bootOld(page)
      version = 'v2'
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration()
        await reg?.update()
      })
      await expect(page.locator('#hero')).toHaveText('Seattle', { timeout: 20_000 })
      await expect(page.locator('#dek')).toHaveText('')
      await expectKeptRoute(page)
      const caches = await page.evaluate(async () => (await caches.keys()).join(' '))
      expect(caches).toContain(V2)
      expect(caches).not.toContain(V1)
    })

    test('a cold start loads the new build, and a deleted chunk reloads instead of going blank', async ({ page }) => {
      version = 'v2'
      await reset(page)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect(page.locator('#hero')).toHaveText('Seattle')
      await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null).catch(() => false), { timeout: 8000 }).toBe(true).catch(async () => {
        await page.reload({ waitUntil: 'domcontentloaded' })
        await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null).catch(() => false), { timeout: 8000 }).toBe(true)
      })
      await page.evaluate(() => import('/assets/GuidePage-CKgn3Vvk.js')).catch(() => {})
      await expect.poll(async () => {
        try {
          return await page.evaluate(() => sessionStorage.getItem('gusto-chunk-reload'))
        } catch {
          return null
        }
      }).toBe('1')
      await expect(page.locator('#hero')).toHaveText('Seattle')
      await expect(page.locator('#guide-text')).not.toHaveText('blank')
      await expectKeptRoute(page)
      await page.locator('#guide').click()
      await expect(page.locator('#guide-text')).toHaveText('Pike Place')
    })
  })
}
