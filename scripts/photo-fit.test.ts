import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { clampView, containSize, tapZoom } from '../src/lib/zoom-fit.ts'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const gallery = readFileSync(new URL('../src/components/PlaceGallery.tsx', import.meta.url), 'utf8')
const entries = readFileSync(new URL('../src/components/GuideEntries.tsx', import.meta.url), 'utf8')

test('full-screen photo fits whole: portrait and landscape letterbox inside phone and desktop stages', () => {
  // phone stage 364x682, desktop stage 1414x738
  for (const [bw, bh] of [[364, 682], [1414, 738]]) {
    for (const [nw, nh] of [[4032, 3024], [3024, 4032], [5712, 4284]]) {
      const fit = containSize(bw, bh, nw, nh)
      assert.ok(fit.w <= bw + 0.01 && fit.h <= bh + 0.01, `${nw}x${nh} fits ${bw}x${bh}`)
      assert.ok(Math.abs(fit.w / fit.h - nw / nh) < 1e-6, 'keeps aspect ratio')
      assert.ok(Math.abs(fit.w - bw) < 0.01 || Math.abs(fit.h - bh) < 0.01, 'touches one side')
    }
  }
})

test('zoomed view can pan to every edge and no further', () => {
  const box = { w: 364, h: 682 }
  const picture = containSize(364, 682, 4032, 3024) // 364 x 273
  const far = clampView({ scale: 3, x: 9999, y: 9999 }, box, picture)
  assert.equal(far.x, (364 * 3 - 364) / 2)
  assert.equal(far.y, (273 * 3 - 682) / 2)
  // at 2x the picture height (546) still fits the stage: no vertical pan into empty space
  assert.equal(clampView({ scale: 2, x: 0, y: 500 }, box, picture).y, 0)
  assert.deepEqual(clampView({ scale: 0.4, x: 30, y: 30 }, box, picture), { scale: 1, x: 0, y: 0 })
  assert.equal(clampView({ scale: 40, x: 0, y: 0 }, box, picture).scale, 5)
  // a tap zoom fills the short side, so a landscape shot on a phone can be panned top to bottom
  assert.ok(tapZoom(box, picture) * picture.h >= box.h)
})

test('lightbox CSS letterboxes the photo instead of cropping it', () => {
  const rule = css.slice(css.lastIndexOf('.lightbox-stage > img'))
  assert.match(rule, /position: absolute;/)
  assert.match(rule, /object-fit: contain;/)
  assert.match(rule, /height: 100%;/)
  assert.match(gallery, /<img src=\{photo\.url\}/, 'full screen uses the original file, not a small variant')
  assert.match(gallery, /pointerType === 'mouse'/, 'click to zoom with a mouse')
  assert.match(gallery, /onWheel/)
})

test('full-screen viewer uses edge chevron arrows, not Previous/Next text', () => {
  assert.match(gallery, /className="lightbox-arrow is-prev"/)
  assert.match(gallery, /className="lightbox-arrow is-next"/)
  assert.match(gallery, /aria-label="Previous photo"/)
  assert.match(gallery, /aria-label="Next photo"/)
  assert.doesNotMatch(gallery, />Previous</)
  assert.doesNotMatch(gallery, />Next</)
  assert.match(css, /\.lightbox-arrow \{/)
  assert.match(css, /min-width: 44px|width: 44px/)
})

test('card photos use a 4:3 / 3:2 frame with a max height, not a fixed-height strip', () => {
  assert.match(css, /\.card-shot \{\s*height: auto;\s*aspect-ratio: 4 \/ 3;\s*max-height: 26rem;/)
  assert.match(css, /@media \(min-width: 640px\) \{\s*\.card-shot \{ aspect-ratio: 3 \/ 2; \}/)
  assert.match(css, /\.guide-shot-wrap \{ width: 100%; max-width: 39rem; \}/)
  assert.match(entries, /guide-shot card-shot/)
  assert.doesNotMatch(entries, /guide-shot relative h-64/)
  assert.match(entries, /toc-shot card-shot/)
  // focal points stay: the portrait-lower crop is untouched
  assert.match(css, /img\.is-portrait\.is-portrait-lower,[\s\S]{0,80}object-position: center 68%;/)
})
