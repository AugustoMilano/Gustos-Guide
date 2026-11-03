// Wikimedia Commons photos for the regions added in November 2026 (D1). Same matcher and license
// rules as fetch-wikimedia.mjs (CC0, public domain or CC BY / BY-SA only, credited), plus a stricter
// place check per region: Vancouver BC (not WA), Portland OR (not ME), New York, Pullman WA and Moscow ID.
// A place keeps its illustration when nothing licensed matches.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { judge, search, download, stripHtml, norm } from './fetch-wikimedia.mjs'
import { permanentlyExcluded } from './permanent-exclusions.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cachePath = join(root, 'data/wikimedia-regions-cache.json')
const cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {}
const FILES = ['vancouver', 'portland', 'nyc', 'palouse']

function cityName(place) {
  if (place.city === 'vancouver') return 'Vancouver'
  if (place.city === 'portland') return 'Portland'
  if (place.city === 'moscow') return 'Moscow'
  if (place.city === 'pullman') return 'Pullman'
  return /Brooklyn/i.test(place.address || '') ? 'Brooklyn' : 'New York'
}

/** Region rules on top of judge(): the text around the file must place it in the right city. */
function regionOk(place, page) {
  const meta = page.imageinfo?.[0]?.extmetadata ?? {}
  const blob = ` ${norm(`${page.title} ${stripHtml(meta.ImageDescription?.value)} ${(page.categories || []).map((c) => c.title).join(' ')}`)} `
  if (place.city === 'vancouver') return blob.includes(' vancouver ') && !/ (washington|wa|clark county) /.test(blob)
  if (place.city === 'portland') return blob.includes(' portland ') && !/ maine /.test(blob)
  if (place.city === 'moscow') return blob.includes(' moscow ') && blob.includes(' idaho ')
  if (place.city === 'pullman') return blob.includes(' pullman ') && / (washington|wsu|palouse) /.test(blob) && !/ (railroad|railway|sleeping car|coach) /.test(blob)
  return / (new york|manhattan|brooklyn|nyc) /.test(blob)
}

async function main() {
  mkdirSync(join(root, 'public/photos'), { recursive: true })
  const files = Object.fromEntries(FILES.map((name) => [name, JSON.parse(readFileSync(join(root, `src/content/${name}.json`), 'utf8'))]))
  const rows = []
  for (const [file, data] of Object.entries(files)) {
    const hoods = [...new Set(data.places.map((place) => place.neighborhood).filter(Boolean))]
    for (const place of data.places) {
      if (permanentlyExcluded(place)) continue
      if (place.photos?.some((photo) => photo.source !== 'illustration')) continue
      if (cache[place.id]) continue
      rows.push({ file, place, hoods })
    }
  }
  console.log('to search', rows.length)
  let next = 0
  let saved = 0
  async function worker() {
    while (next < rows.length) {
      const { file, place, hoods } = rows[next++]
      const subject = { ...place, cityName: cityName(place) }
      try {
        const pages = await search(place.name, subject.cityName)
        const hit = pages.map((page) => (regionOk(place, page) ? judge(subject, page, hoods) : null)).find(Boolean)
        if (!hit) {
          cache[place.id] = { miss: true }
        } else {
          const got = await download(hit.url)
          const url = `/photos/${place.id}${got.ext}`
          writeFileSync(join(root, 'public', url.slice(1)), got.bytes)
          place.photos = [{
            source: 'wikimedia',
            url,
            alt: `${place.name} in ${place.neighborhood || subject.cityName}`,
            credit: hit.credit,
            creditUrl: hit.creditUrl,
            license: hit.license,
          }]
          cache[place.id] = { file: url, title: hit.title, license: hit.license, why: hit.why, region: file }
          saved += 1
          console.log('saved', file, place.name, '<-', hit.title)
        }
      } catch (error) {
        console.warn('fail', place.name, error.message)
      }
      await new Promise((resolve) => setTimeout(resolve, 400))
    }
  }
  await Promise.all([worker(), worker(), worker()])
  for (const [name, data] of Object.entries(files)) writeFileSync(join(root, `src/content/${name}.json`), `${JSON.stringify(data, null, 2)}\n`)
  writeFileSync(cachePath, JSON.stringify(cache, null, 1))
  console.log('saved', saved)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
