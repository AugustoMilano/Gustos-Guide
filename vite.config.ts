import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'
import { defineConfig } from 'vite'

// /terms and /privacy are real HTML files. Rewrite the extensionless path
// before Vite's SPA fallback so dev and preview serve the same documents
// Cloudflare Pages serves from terms/index.html and privacy/index.html.
const legalPaths: Connect.NextHandleFunction = (req, _res, next) => {
  const [path, query] = (req.url || '').split('?')
  const search = query ? `?${query}` : ''
  if (path === '/terms' || path === '/terms/') req.url = `/terms/index.html${search}`
  if (path === '/privacy' || path === '/privacy/') req.url = `/privacy/index.html${search}`
  // public/auth/callback/index.html is the OAuth landing page. Vite's SPA
  // fallback would serve the app here, and relative /assets/ would 404.
  if (path === '/auth/callback' || path === '/auth/callback/') req.url = `/auth/callback/index.html${search}`
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
  ],
  server: {
    host: '127.0.0.1',
    port: 4179,
  },
})
