import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
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
        const htmlPath = join(process.cwd(), 'dist/index.html')
        if (!name || !existsSync(htmlPath)) return
        const href = `./assets/${name}`
        const html = readFileSync(htmlPath, 'utf8')
        if (html.includes(href)) return
        const tag = `    <link rel="preload" href="${href}" as="fetch" crossorigin />\n`
        writeFileSync(htmlPath, html.replace('</head>', `${tag}  </head>`))
      },
    },
    react(),
    tailwindcss(),
    {
      name: 'perf-hints',
      transformIndexHtml(html) {
        const hints = ['<link rel="preconnect" href="https://tiles.openfreemap.org" crossorigin />']
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
  ],
  server: {
    host: '127.0.0.1',
    port: 4179,
  },
})
