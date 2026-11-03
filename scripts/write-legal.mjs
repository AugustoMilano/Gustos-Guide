import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { legalDocs } from '../src/content/legal.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function rich(text) {
  return escapeHtml(text)
    .replaceAll('hello@gustosguide.com', '<a href="mailto:hello@gustosguide.com">hello@gustosguide.com</a>')
    .replaceAll('/privacy', '<a href="/privacy/">/privacy/</a>')
    .replaceAll('/terms', '<a href="/terms/">/terms/</a>')
}

function page(doc) {
  const body = doc.paragraphs.map((paragraph) => `    <p>${rich(paragraph)}</p>`).join('\n')
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.title)} · Gusto's Guide</title>
  <meta name="description" content="${escapeHtml(doc.description)}" />
  <link rel="canonical" href="https://gustosguide.com/${doc.slug}/" />
  <meta property="og:title" content="${escapeHtml(doc.title)} · Gusto's Guide" />
  <meta property="og:description" content="${escapeHtml(doc.description)}" />
  <meta property="og:url" content="https://gustosguide.com/${doc.slug}/" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="https://gustosguide.com/og/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://gustosguide.com/og/og.png" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <style>
    :root { color-scheme: light; }
    body { margin: 0; background: #eee3d6; color: #181818; font-family: Georgia, "Times New Roman", serif; }
    a { color: #141f4d; }
    header, main, footer { box-sizing: border-box; }
    header { background: #141f4d; color: #fffaf3; padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) 1rem max(1rem, env(safe-area-inset-left)); }
    header a { display: inline-flex; align-items: center; min-height: 44px; color: #fffaf3; font-size: 1.8rem; font-style: italic; text-decoration: none; }
    footer a { display: inline-flex; align-items: center; min-height: 44px; }
    main { max-width: 40rem; margin: 0 auto; padding: 2rem max(1rem, env(safe-area-inset-right)) 3rem max(1rem, env(safe-area-inset-left)); }
    h1 { font-size: clamp(2.6rem, 8vw, 4rem); font-weight: 400; font-style: italic; line-height: 1; margin: 0.4rem 0 1.2rem; }
    p { font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 1.05rem; line-height: 1.55; margin: 0 0 1rem; }
    footer { border-top: 1px solid rgb(24 24 24 / 15%); padding: 1rem max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left)); font-family: "Avenir Next", "Segoe UI", sans-serif; font-size: 0.9rem; }
  </style>
</head>
<body>
  <header><a href="/">Gusto's Guide</a></header>
  <main id="main">
    <h1>${escapeHtml(doc.title)}</h1>
${body}
  </main>
  <footer><a href="/">Back to the guide</a></footer>
  <script src="/legal.js" defer></script>
</body>
</html>
`
}

for (const doc of legalDocs) {
  const dir = join(root, 'public', doc.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), page(doc))
  console.log(`legal /${doc.slug}`)
}
