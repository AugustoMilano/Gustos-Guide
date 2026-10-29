import { existsSync, readFileSync } from 'node:fs'
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
    .filter((cols) => cols.length >= 3 && cols[2] === '200' && cols[1] === '/route/index.html')
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
    if (rule.parts.length !== parts.length) continue
    const matched = rule.parts.every((part, index) => part.startsWith(':') ? parts[index].length > 0 : part === parts[index])
    if (matched) return rule.target
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
  // Direct /guides, /search, /tonight, and the other hash routes. Cloudflare
  // serves guides/index.html or a 200 rewrite to the same hop. Preview has
  // no _redirects engine, so apply that table here.
  if ((req.url || '').split('?')[0] === path) {
    const indexed = directoryIndex(path)
    const rewritten = indexed || clientRewrite(path)
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
