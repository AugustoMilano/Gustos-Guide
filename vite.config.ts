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
