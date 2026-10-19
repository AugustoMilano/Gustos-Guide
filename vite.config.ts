import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Connect } from 'vite'
import { defineConfig } from 'vite'

// /terms and /privacy are real HTML files. Rewrite the extensionless path
// before Vite's SPA fallback so dev and preview serve the same documents
// Cloudflare Pages serves from terms/index.html and privacy/index.html.
const legalPaths: Connect.NextHandleFunction = (req, _res, next) => {
  const path = req.url?.split('?')[0]
  if (path === '/terms' || path === '/terms/') req.url = '/terms/index.html'
  if (path === '/privacy' || path === '/privacy/') req.url = '/privacy/index.html'
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
