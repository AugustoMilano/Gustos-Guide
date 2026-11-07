import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'
import { CREAM, NAVY, faviconSvg, markMarkup, markSvg, squareSvg, tileSvg } from './logo-geometry.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const store = '/cursor/stores/self/logo'

function maskableSvg(scale) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${NAVY}"/>
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${markMarkup()}</g>
</svg>
`
}

const files = {
  'logo-tile.svg': tileSvg(),
  'logo-mark.svg': markSvg(),
  'favicon.svg': faviconSvg(),
}

for (const [name, svg] of Object.entries(files)) writeFileSync(join(publicDir, name), svg)

const component = `export function LogoMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      ${markMarkup().trim()}
    </svg>
  )
}
`
writeFileSync(join(root, 'src/components/LogoMark.tsx'), component)

const browser = await chromium.launch({
  executablePath: '/home/ubuntu/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',
  headless: true,
})

async function raster(svg, size, file) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  const doc = svg.includes('width=')
    ? svg.replace(/width="[^"]+" height="[^"]+"/, `width="${size}" height="${size}"`)
    : svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(`<!doctype html><body style="margin:0;background:transparent">${doc}</body>`, { waitUntil: 'load' })
  await page.screenshot({ path: file, omitBackground: true })
  await page.close()
}

await raster(squareSvg(), 180, join(publicDir, 'apple-touch-icon.png'))
await raster(squareSvg(), 192, join(publicDir, 'icon-192.png'))
await raster(squareSvg(), 512, join(publicDir, 'icon-512.png'))
await raster(maskableSvg(1), 192, join(publicDir, 'icon-192-maskable.png'))
await raster(maskableSvg(1), 512, join(publicDir, 'icon-512-maskable.png'))
await raster(tileSvg(), 256, join(publicDir, 'logo-email.png'))
await raster(faviconSvg(), 128, '/tmp/logo-favicon-128.png')
const down = spawnSync('python3', ['-c', `
from PIL import Image
Image.open('/tmp/logo-favicon-128.png').convert('RGBA').resize((16, 16), Image.Resampling.BOX).save('/tmp/logo-favicon-16.png')
`])
if (down.status !== 0) {
  console.error(down.stderr)
  process.exit(down.status ?? 1)
}
await raster(tileSvg(), 32, '/tmp/logo-tile-32.png')
await raster(tileSvg(), 48, '/tmp/logo-tile-48.png')
await raster(tileSvg(), 512, '/tmp/logo-tile-512.png')
await raster(tileSvg(), 64, '/tmp/logo-tile-64.png')
await raster(tileSvg(), 16, '/tmp/logo-tile-16.png')

const { readFileSync } = await import('node:fs')
function png(file) {
  return `data:image/png;base64,${readFileSync(file).toString('base64')}`
}
const preview = `<!doctype html>
<html><body style="margin:0;background:${CREAM};color:#181818;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif">
  <div style="display:flex;align-items:end;gap:28px;padding:36px 36px 28px">
    <figure style="margin:0"><img width="512" height="512" alt="" src="${png('/tmp/logo-tile-512.png')}" style="display:block"/><figcaption style="margin-top:8px;font-family:sans-serif;font-size:14px">512</figcaption></figure>
    <figure style="margin:0"><img width="64" height="64" alt="" src="${png('/tmp/logo-tile-64.png')}" style="display:block;image-rendering:pixelated"/><figcaption style="margin-top:8px;font-family:sans-serif;font-size:14px">64</figcaption></figure>
    <figure style="margin:0"><img width="32" height="32" alt="" src="${png('/tmp/logo-tile-32.png')}" style="display:block;image-rendering:pixelated"/><figcaption style="margin-top:8px;font-family:sans-serif;font-size:14px">32</figcaption></figure>
    <figure style="margin:0"><img width="16" height="16" alt="" src="${png('/tmp/logo-favicon-16.png')}" style="display:block;image-rendering:pixelated"/><figcaption style="margin-top:8px;font-family:sans-serif;font-size:14px">16</figcaption></figure>
    <figure style="margin:0"><img width="160" height="160" alt="" src="${png('/tmp/logo-favicon-16.png')}" style="display:block;image-rendering:pixelated"/><figcaption style="margin-top:8px;font-family:sans-serif;font-size:14px">16 ×10</figcaption></figure>
  </div>
  <div style="height:84px;background:#fffaf3;display:flex;align-items:center;gap:12px;padding:0 24px;border-top:1px solid #181818">
    ${markSvg().replace('<svg ', '<svg width="36" height="36" ')}
    <span style="font-style:italic;font-size:32px;color:#181818">Gusto's Guide</span>
  </div>
  <div style="height:84px;background:${NAVY};display:flex;align-items:center;gap:12px;padding:0 24px">
    ${markSvg().replace('<svg ', '<svg width="36" height="36" ')}
    <span style="font-style:italic;font-size:32px;color:#fffaf3">Gusto's Guide</span>
  </div>
</body></html>`
const sheet = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 })
await sheet.setContent(preview, { waitUntil: 'load' })
await sheet.screenshot({ path: '/tmp/logo-preview.png' })
await browser.close()

const splashes = [
  [1170, 2532],
  [1284, 2778],
  [1290, 2796],
  [1179, 2556],
  [1125, 2436],
  [828, 1792],
  [750, 1334],
  [2048, 2732],
]
const py = spawnSync('python3', ['-'], {
  input: `
from PIL import Image
cream = (238, 227, 214)
tile = Image.open('/tmp/logo-tile-512.png').convert('RGBA')
import struct
from io import BytesIO
def png_bytes(image):
    buf = BytesIO()
    image.save(buf, format='PNG')
    return buf.getvalue()
icons = [
    Image.open('/tmp/logo-favicon-16.png').convert('RGBA').resize((16, 16), Image.Resampling.BOX),
    Image.open('/tmp/logo-tile-32.png').convert('RGBA').resize((32, 32), Image.Resampling.BOX),
    Image.open('/tmp/logo-tile-48.png').convert('RGBA').resize((48, 48), Image.Resampling.BOX),
]
blobs = [png_bytes(image) for image in icons]
ico = struct.pack('<HHH', 0, 1, len(blobs))
offset = 6 + 16 * len(blobs)
for image, blob in zip(icons, blobs):
    ico += struct.pack('<BBBBHHII', image.width, image.height, 0, 0, 1, 32, len(blob), offset)
    offset += len(blob)
ico += b''.join(blobs)
open(${JSON.stringify(join(publicDir, 'favicon.ico'))}, 'wb').write(ico)
for w, h in ${JSON.stringify(splashes)}:
    canvas = Image.new('RGB', (w, h), cream)
    side = max(96, int(min(w, h) * 0.18))
    icon = tile.resize((side, side), Image.Resampling.LANCZOS)
    canvas.paste(icon, ((w - side) // 2, (h - side) // 2), icon)
    canvas.save(${JSON.stringify(publicDir)} + f'/splash-{w}x{h}.png')
phone = Image.new('RGB', (1170, 2532), cream)
side = int(1170 * 0.18)
icon = tile.resize((side, side), Image.Resampling.LANCZOS)
phone.paste(icon, ((1170 - side) // 2, (2532 - side) // 2), icon)
phone.save(${JSON.stringify(join(publicDir, 'splash-iphone.png'))})
print('icons written')
`,
  encoding: 'utf8',
})
if (py.status !== 0) {
  console.error(py.stdout)
  console.error(py.stderr)
  process.exit(py.status ?? 1)
}
console.log(py.stdout.trim())

mkdirSync(store, { recursive: true })
const exported = [
  'logo-tile.svg',
  'logo-mark.svg',
  'favicon.svg',
  'favicon.ico',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'icon-192-maskable.png',
  'icon-512-maskable.png',
  'logo-email.png',
]
for (const name of exported) {
  const bytes = await import('node:fs').then((fs) => fs.readFileSync(join(publicDir, name)))
  writeFileSync(join(store, name), bytes)
}
const previewBytes = await import('node:fs').then((fs) => fs.readFileSync('/tmp/logo-preview.png'))
writeFileSync(join(store, 'logo-preview.png'), previewBytes)
console.log('store', store)
