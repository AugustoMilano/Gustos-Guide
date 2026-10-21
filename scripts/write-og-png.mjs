import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ogDir = join(root, 'public/og')

function svgsIn(dir) {
  const found = []
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name)
    if (name.isDirectory()) found.push(...svgsIn(path))
    else if (name.name.endsWith('.svg')) found.push(path)
  }
  return found
}

const files = svgsIn(ogDir)
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
let written = 0
for (const path of files) {
  const svg = readFileSync(path, 'utf8')
  const html = `<!doctype html><html><head><style>html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:#141F4D}img{display:block;width:1200px;height:630px}</style></head><body><img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"></body></html>`
  await page.setContent(html, { waitUntil: 'load' })
  const png = path.replace(/\.svg$/, '.png')
  const buffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } })
  writeFileSync(png, buffer)
  written += 1
}
await browser.close()
console.log(`og png ${written}`)
