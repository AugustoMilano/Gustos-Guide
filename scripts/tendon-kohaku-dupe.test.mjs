import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const tree = new URL('..', import.meta.url).pathname
const east = JSON.parse(readFileSync(new URL('../src/content/eastside.json', import.meta.url), 'utf8'))
const sizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))
const place = east.places.find((p) => p.id === 'tendon-kohaku')
const photosDir = join(tree, 'public/photos')

test('Tendon Kohaku keeps one high-res Gusto photo and drops the duplicate', () => {
  assert.ok(place, 'eastside catalog has tendon-kohaku')
  const gusto = (place.photos ?? []).filter((photo) => photo.source === 'gusto')
  assert.deepEqual(
    gusto.map((photo) => photo.url),
    ['/photos/tendon-kohaku-gusto-1.jpg'],
  )
  assert.match(gusto[0].alt, /carbonara/)
  assert.equal(gusto[0].credit, 'Photo by Gusto')
  assert.equal(place.photos[0].url, '/photos/tendon-kohaku-gusto-1.jpg')
  assert.equal(place.photos[1]?.source, 'illustration')
  assert.equal((place.photos ?? []).some((photo) => (photo.url ?? '').includes('gusto-2')), false)
})

test('duplicate gusto-2 assets are gone; gusto-1 sizes and files stay', () => {
  assert.equal('tendon-kohaku-gusto-2.jpg' in sizes, false)
  const leftover = readdirSync(photosDir).filter((name) => name.startsWith('tendon-kohaku-gusto-2'))
  assert.deepEqual(leftover, [])
  const kept = sizes['tendon-kohaku-gusto-1.jpg']
  assert.equal(kept.w, 5712)
  assert.equal(kept.h, 4284)
  assert.ok(existsSync(join(photosDir, 'tendon-kohaku-gusto-1.jpg')))
  for (const w of kept.widths) {
    if (w !== kept.w) assert.ok(existsSync(join(photosDir, `tendon-kohaku-gusto-1.${w}.jpg`)), String(w))
  }
  for (const w of kept.webp) {
    const name = w === kept.w ? 'tendon-kohaku-gusto-1.webp' : `tendon-kohaku-gusto-1.${w}.webp`
    assert.ok(existsSync(join(photosDir, name)), name)
  }
  for (const w of kept.avif) {
    const name = w === kept.w ? 'tendon-kohaku-gusto-1.avif' : `tendon-kohaku-gusto-1.${w}.avif`
    assert.ok(existsSync(join(photosDir, name)), name)
  }
})
