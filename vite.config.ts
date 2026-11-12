import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'
import { defineConfig } from 'vite'

function shareCard(urlPath: string): string | null {
  const clean = urlPath.endsWith('/') ? urlPath.slice(0, -1) : urlPath
  const rel = `${clean.slice(1)}/index.html`
  for (const root of ['dist', 'public']) {
    const file = join(process.cwd(), root, rel)
    if (existsSync(file)) return file
  }
  return null
}

function notFoundPage(): string {
  for (const root of ['dist', 'public']) {
    const file = join(process.cwd(), root, '404.html')
    if (existsSync(file)) return readFileSync(file, 'utf8')
  }
  return '<!doctype html><title>Page not found</title><h1>That page is not on the menu.</h1>'
}

function publishedFile(rel: string): boolean {
  return ['dist', 'public'].some((root) => existsSync(join(process.cwd(), root, rel)))
}

type RedirectRule = { parts: string[]; target: string }

let redirectRules: RedirectRule[] | null = null

function clientRedirects(): RedirectRule[] {
  if (redirectRules) return redirectRules
  let text = ''
  for (const root of ['public', 'dist']) {
    const file = join(process.cwd(), root, '_redirects')
    if (existsSync(file)) {
      text = readFileSync(file, 'utf8')
      break
    }
  }
  redirectRules = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/))
    .filter((cols) => cols.length >= 3 && cols[2] === '200' && cols[1] === '/hop.htm')
    .map((cols) => ({ parts: cols[0].split('/'), target: cols[1] }))
  return redirectRules
}

function directoryIndex(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, '') || '/'
  if (clean === '/') return null
  const rel = `${clean.slice(1)}/index.html`
  return publishedFile(rel) ? `/${rel}` : null
}

function clientRewrite(pathname: string): string | null {
  const parts = pathname.split('/')
  for (const rule of clientRedirects()) {
    let index = 0
    let matched = true
    for (; index < rule.parts.length; index += 1) {
      const part = rule.parts[index]
      if (part === '*') {
        const rest = parts.slice(index).filter(Boolean)
        matched = rest.length > 0 && index === rule.parts.length - 1
        index = parts.length
        break
      }
      if (part.startsWith(':')) {
        if (!parts[index]) matched = false
      } else if (part !== parts[index]) {
        matched = false
      }
      if (!matched) break
    }
    if (matched && parts.slice(index).every((part) => part === '')) return rule.target
  }
  return null
}

// /terms and /privacy are real HTML files. Rewrite the extensionless path
// before Vite's SPA fallback so dev and preview serve the same documents
// Cloudflare Pages serves from terms/index.html and privacy/index.html.
const legalPaths: Connect.NextHandleFunction = (req, res, next) => {
  const [path, query] = (req.url || '').split('?')
  const search = query ? `?${query}` : ''
  if (path === '/terms' || path === '/terms/') req.url = `/terms/index.html${search}`
  if (path === '/privacy' || path === '/privacy/') req.url = `/privacy/index.html${search}`
  // public/auth/callback/index.html is the OAuth landing page. Vite's SPA
  // fallback would serve the app here, and relative /assets/ would 404.
  if (path === '/auth/callback' || path === '/auth/callback/') req.url = `/auth/callback/index.html${search}`
  // Share cards are real HTML files. Without this, the dev server's SPA
  // fallback serves the app and the card title never reaches a crawler.
  // A card that was removed has no file. Answer 404 instead of the app shell.
  if (path.startsWith('/share/') && !path.split('/').pop()?.includes('.')) {
    if (!shareCard(path)) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('X-Robots-Tag', 'noindex')
      res.end(notFoundPage())
      return
    }
    const clean = path.endsWith('/') ? path.slice(0, -1) : path
    req.url = `${clean}/index.html${search}`
  }
  // Direct client routes rewrite to hop.htm, which sends the browser to
  // /#/that-path. Pages pretty-URLs an index.html target into a 308, so
  // preview applies the same hop.htm table instead.
  if ((req.url || '').split('?')[0] === path) {
    const rewritten = clientRewrite(path) || directoryIndex(path)
    if (rewritten) req.url = `${rewritten}${search}`
  }
  next()
}

// Relative asset paths so `dist/` works on GitHub Pages project sites
// and any other static host without a rewrite rule.
export default defineConfig({
  base: './',
  plugins: [
    {
      // The CSS minifier keeps only -webkit-backdrop-filter, so Chrome and Android lose the glass blur.
      // Put the standard property back next to every prefixed declaration.
      name: 'standard-backdrop-filter',
      enforce: 'post',
      generateBundle(_options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type !== 'asset' || !file.fileName.endsWith('.css') || typeof file.source !== 'string') continue
          file.source = file.source.replace(
            /([{;])-webkit-backdrop-filter:([^;}]+)(?=[;}])(?!;backdrop-filter:)/g,
            '$1-webkit-backdrop-filter:$2;backdrop-filter:$2',
          )
        }
      },
      // The CSS file name was hashed before the rewrite above. Rename each stylesheet by a hash of
      // its final bytes and update every reference, so a changed stylesheet always gets a new URL.
      writeBundle(options) {
        const out = options.dir ?? 'dist'
        const assets = join(out, 'assets')
        if (!existsSync(assets)) return
        const renames: [string, string][] = []
        for (const name of readdirSync(assets)) {
          const match = name.match(/^(.*)-[\w-]{8}\.css$/)
          if (!match) continue
          const hash = createHash('sha256').update(readFileSync(join(assets, name))).digest('base64url').slice(0, 8)
          const next = `${match[1]}-${hash}.css`
          if (next === name) continue
          renameSync(join(assets, name), join(assets, next))
          renames.push([name, next])
        }
        if (!renames.length) return
        const walk = (dir: string) => {
          for (const entry of readdirSync(dir)) {
            const file = join(dir, entry)
            if (statSync(file).isDirectory()) { walk(file); continue }
            if (!/\.(html|htm|js|mjs|json|webmanifest|txt)$/.test(entry)) continue
            const text = readFileSync(file, 'utf8')
            let next = text
            for (const [from, to] of renames) next = next.split(from).join(to)
            if (next !== text) writeFileSync(file, next)
          }
        }
        walk(out)
      },
    },
    {
      name: 'legal-pages',
      configureServer(server) {
        server.middlewares.use(legalPaths)
      },
      configurePreviewServer(server) {
        server.middlewares.use(legalPaths)
      },
    },
    {
      name: 'slim-catalog',
      buildStart() {
        const result = spawnSync(process.execPath, ['scripts/write-slim-catalog.mjs'], { stdio: 'inherit' })
        if (result.status !== 0) throw new Error('slim catalog')
      },
      closeBundle() {
        const assets = join(process.cwd(), 'dist/assets')
        if (!existsSync(assets)) return
        const name = readdirSync(assets).find((file) => file.startsWith('slim-catalog-') && file.endsWith('.json'))
        // status.js adds the preload (low priority) on every route except place deep links (C1).
        const statusPath = join(process.cwd(), 'dist/status.js')
        if (!name || !existsSync(statusPath)) return
        writeFileSync(statusPath, readFileSync(statusPath, 'utf8').replace("/*CATALOG*/''", JSON.stringify(`/assets/${name}`)))
        // D2: the app script and its modulepreloads move from index.html into status.js, which adds
        // them at once on most routes but lets a place deep link's hero photo finish first, since
        // Cloudflare shares the bandwidth evenly instead of honoring fetchpriority.
        const htmlPath = join(process.cwd(), 'dist/index.html')
        let html = readFileSync(htmlPath, 'utf8')
        const entry = html.match(/<script type="module"[^>]*src="\.?\/(assets\/[^"]+)"><\/script>\n?\s*/)
        if (!entry) throw new Error('boot: entry script not found')
        const preloads = [...html.matchAll(/<link rel="modulepreload"[^>]*href="\.?\/(assets\/[^"]+)">\n?\s*/g)]
        for (const match of [entry, ...preloads]) html = html.replace(match[0], '')
        writeFileSync(htmlPath, html)
        const boot = { entry: entry[1], preloads: preloads.map((match) => match[1]) }
        writeFileSync(statusPath, readFileSync(statusPath, 'utf8').replace('/*BOOT*/null', JSON.stringify(boot)))
      },
    },
    react(),
    tailwindcss(),
    {
      // status.js runs in <head> before the app script. Give it each heavy route's chunk list so a
      // deep link to Top 25 or a place starts those downloads in parallel with the entry bundle
      // instead of after it.
      name: 'route-preloads',
      closeBundle() {
        const dist = join(process.cwd(), 'dist')
        const manifestPath = join(dist, '.vite/manifest.json')
        const statusPath = join(dist, 'status.js')
        if (!existsSync(manifestPath) || !existsSync(statusPath)) return
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, { file: string; imports?: string[]; isEntry?: boolean }>
        const entry = Object.values(manifest).find((chunk) => chunk.isEntry)
        const skip = new Set([entry?.file, ...(entry?.imports ?? []).map((key) => manifest[key]?.file)])
        const files = (key: string) => {
          const out: string[] = []
          const walk = (k: string) => {
            const chunk = manifest[k]
            if (!chunk || out.includes(chunk.file) || skip.has(chunk.file)) return
            out.push(chunk.file)
            for (const next of chunk.imports ?? []) walk(next)
          }
          walk(key)
          return out
        }
        const routes = { top: files('src/pages/TopPage.tsx'), place: files('src/pages/PlacePage.tsx') }
        const status = readFileSync(statusPath, 'utf8')
        writeFileSync(statusPath, status.replace('/*ROUTE_PRELOADS*/{}', JSON.stringify(routes)))
        rmSync(join(dist, '.vite'), { recursive: true, force: true })
        // Place deep links: status.js reads this map to preload the hero photo before the catalog
        // arrives. Same pick as displayPhotos() without uploads: Gusto's own shot, then commons.
        const sizes = JSON.parse(readFileSync('src/content/photo-sizes.json', 'utf8')) as Record<string, { w: number; webp?: number[]; avif?: number[] }>
        const heroes: Record<string, string> = {}
        const avifHeroes: Record<string, string> = {}
        for (const name of ['places', 'eastside', 'la', 'sf', 'sd', 'vancouver', 'portland', 'nyc', 'palouse']) {
          const data = JSON.parse(readFileSync(`src/content/${name}.json`, 'utf8'))
          const list = (Array.isArray(data) ? data : Array.isArray(data.places) ? data.places : Object.values(data)) as { id?: string; photo?: { source?: string; url?: string }; photos?: { source?: string; url?: string }[] }[]
          for (const place of list) {
            if (!place || typeof place !== 'object' || !place.id) continue
            const catalog = (place.photos?.length ? place.photos : place.photo ? [place.photo] : []).filter((p) => p && typeof p === 'object' && p.url)
            const pick = catalog.find((p) => p.source === 'gusto') ?? catalog.find((p) => p.source === 'wikimedia' || p.source === 'flickr')
            const file = pick?.url?.startsWith('/photos/') ? pick.url.slice(8) : ''
            const entry = sizes[file]
            if (!entry?.webp?.length) continue
            const stem = file.replace(/\.(jpe?g|png|webp)$/i, '')
            heroes[place.id] = entry.webp.map((w) => (w === entry.w ? `/photos/${stem}.webp ${w}w` : `/photos/${stem}.${w}.webp ${w}w`)).join(', ')
            if (entry.avif?.length) avifHeroes[place.id] = entry.avif.map((w) => (w === entry.w ? `/photos/${stem}.avif ${w}w` : `/photos/${stem}.${w}.avif ${w}w`)).join(', ')
          }
        }
                // Place deep links (C1): one small file per place so the page renders without the 245 KB
        // of region data or the 100 KB catalog. Same records the app already ships, unchanged.
        const pd = join(dist, 'pd')
        mkdirSync(pd, { recursive: true })
        for (const name of ['places', 'eastside', 'la', 'sf', 'sd', 'vancouver', 'portland', 'nyc', 'palouse']) {
          const data = JSON.parse(readFileSync(`src/content/${name}.json`, 'utf8'))
          const list = (Array.isArray(data) ? data : Array.isArray(data.places) ? data.places : Object.values(data)) as { id?: string }[]
          for (const place of list) {
            if (!place || typeof place !== 'object' || !place.id || !/^[a-z0-9-]+$/.test(place.id)) continue
            writeFileSync(join(pd, `${place.id}.json`), JSON.stringify({ place }))
          }
        }
        // Hero srcsets ride in status.js so the photo starts with the first request wave (C1).
        // 1 = the standard /photos/<id>.<w>.webp set at 200/400/720/960.
        const compact: Record<string, 1 | 2 | [string, string]> = {}
        for (const [id, set] of Object.entries(heroes)) {
          const std = (ext: string) => [200, 400, 720, 960].map((w) => `/photos/${id}.${w}.${ext} ${w}w`).join(', ')
          const avif = avifHeroes[id] ?? ''
          if (set === std('webp') && !avif) compact[id] = 1
          else if (set === std('webp') && avif === std('avif')) compact[id] = 2
          else compact[id] = [set, avif]
        }
        const statusNow = readFileSync(statusPath, 'utf8')
        writeFileSync(statusPath, statusNow.replace('/*HEROES*/{}', JSON.stringify(compact)))
      },
    },
    {
      name: 'perf-hints',
      transformIndexHtml(html) {
        const hints = [
          '<link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin />',
          '<link rel="preload" as="fetch" href="https://tiles.openfreemap.org/styles/positron" crossorigin />',
          '<link rel="preload" as="fetch" href="https://tiles.openfreemap.org/planet" crossorigin />',
        ]
        const supabase = process.env.VITE_SUPABASE_URL
        if (supabase) {
          try {
            hints.push(`<link rel="preconnect" href="${new URL(supabase).origin}" crossorigin />`)
          } catch {
            // A bad build env should not take the document down.
          }
        }
        return html.replace('</head>', `    ${hints.join('\n    ')}\n  </head>`)
      },
    },
    {
      // Static landing and Top shells paint from HTML + CSS + fonts alone. With ~20 module chunks
      // sharing the connection at equal priority, the stylesheet and fonts arrived late (fix77
      // measured +0.4 s FCP), so shared chunk preloads yield to them.
      name: 'chunk-priority',
      transformIndexHtml: {
        order: 'post',
        // The entry script yields too: every first paint (landing, Top 25, place hero) is static now.
        handler: (html) =>
          html
            .replace(/<link rel="modulepreload" crossorigin href=/g, '<link rel="modulepreload" fetchpriority="low" crossorigin href=')
            .replace(/<script type="module" crossorigin src=/g, '<script type="module" fetchpriority="low" crossorigin src='),
      },
    },
  ],
  build: { manifest: true },
  server: {
    host: '127.0.0.1',
    port: 4179,
  },
})
