// Every file under public/photos must have bytes, and every variant listed in
// photo-sizes.json must exist and start with the right file signature.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const photos = new URL('../public/photos/', import.meta.url).pathname
const sizes = JSON.parse(readFileSync(new URL('../src/content/photo-sizes.json', import.meta.url), 'utf8'))

const head = (file, n = 16) => readFileSync(join(photos, file)).subarray(0, n)
const isAvif = (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' && /^avi[fs]$/.test(b.subarray(8, 12).toString('latin1'))
const isWebp = (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP'
const isJpeg = (b) => b[0] === 0xff && b[1] === 0xd8

test('no photo file is empty', () => {
  const empty = readdirSync(photos).filter((f) => statSync(join(photos, f)).isFile() && statSync(join(photos, f)).size === 0)
  assert.deepEqual(empty, [])
})

test('every listed variant exists with a valid signature', () => {
  const bad = []
  for (const [name, info] of Object.entries(sizes)) {
    const stem = name.replace(/\.(jpe?g|png)$/i, '')
    const check = (file, ok) => { if (!existsSync(join(photos, file)) || !ok(head(file))) bad.push(file) }
    for (const w of info.avif ?? []) check(w === info.w ? `${stem}.avif` : `${stem}.${w}.avif`, isAvif)
    for (const w of info.webp ?? []) check(w === info.w ? `${stem}.webp` : `${stem}.${w}.webp`, isWebp)
    for (const w of info.widths ?? []) if (w !== info.w) check(`${stem}.${w}.jpg`, isJpeg)
  }
  assert.deepEqual(bad, [])
})

test('Ascend photo 9 has a real 960 AVIF', () => {
  const file = 'ascend-prime-steak-and-sushi-gusto-9.960.avif'
  assert.ok(statSync(join(photos, file)).size > 10_000)
  assert.ok(isAvif(head(file)))
})

test('reissued variants carry a version query in the srcset', () => {
  const src = readFileSync(new URL('../src/lib/responsivePhoto.ts', import.meta.url), 'utf8')
  assert.match(src, /'ascend-prime-steak-and-sushi-gusto-9\.960\.avif': 2/)
  assert.equal((src.match(/photoPath\(`/g) ?? []).length, 5, 'every jpg/webp/avif variant URL goes through photoPath')
  for (const [, name] of src.matchAll(/'([^']+\.(?:avif|webp|jpg))': \d+/g)) assert.ok(statSync(join(photos, name)).size > 0, name)
})
