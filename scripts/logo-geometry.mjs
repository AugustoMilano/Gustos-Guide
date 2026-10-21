// Geometric Gusto mark. A capital G whose stroke runs from the crossbar,
// around the bottom and left, over the top, and ends in a fork. Not traced.

export const NAVY = '#141F4D'
export const CORAL = '#FF5330'
export const CREAM = '#EEE3D6'

const R = 12.7
const CX = 23.4
const CY = 37.6
const STROKE = 5.7
const END = 100
const UP = 14
const NECK = 1.3
const PALM = 2.5
const PALM_W = 9.6
const TINE_W = 1.65
const TINE_GAP = 1.4
const TINE_LEN = 10.4
const BAR_IN = 2.4

function rad(deg) {
  return (deg * Math.PI) / 180
}

function round(n) {
  return Math.round(n * 100) / 100
}

function onCircle(deg) {
  return [CX + R * Math.cos(rad(deg)), CY - R * Math.sin(rad(deg))]
}

function layout(tines) {
  const [sx, sy] = onCircle(0)
  const [ex, ey] = onCircle(END)
  const dir = [Math.cos(rad(UP)), -Math.sin(rad(UP))]
  const perp = [-dir[1], dir[0]]
  const down = perp[1] > 0 ? perp : [-perp[0], -perp[1]]
  const add = (p, v, s) => [p[0] + v[0] * s, p[1] + v[1] * s]
  const neckEnd = add([ex, ey], dir, NECK)
  const palmEnd = add(neckEnd, dir, PALM)
  const tineW = tines === 3 ? 2.35 : TINE_W
  const gap = tines === 3 ? 1.55 : TINE_GAP
  const pitch = tineW + gap
  const palmW = tines === 3 ? 11.6 : PALM_W
  const lines = []
  const tips = []
  const bury = tines === 3 ? 2.8 : 1.7
  for (let i = 0; i < tines; i += 1) {
    const off = (i - (tines - 1) / 2) * pitch
    const base = add(add(palmEnd, dir, -bury), down, off)
    const tip = add(base, dir, TINE_LEN)
    lines.push(`M ${round(base[0])} ${round(base[1])} L ${round(tip[0])} ${round(tip[1])}`)
    tips.push(base, tip)
  }
  return { sx, sy, ex, ey, dir, neckEnd, palmEnd, lines, tips, tineW, palmW }
}

function bounds(part) {
  const pts = []
  for (let deg = 0; deg >= END - 360; deg -= 3) pts.push(onCircle(((deg % 360) + 360) % 360))
  pts.push([part.sx, part.sy], [CX + BAR_IN, part.sy], [part.ex, part.ey], part.palmEnd, ...part.tips)
  const pad = part.palmW / 2
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + part.tineW / 2
  const minY = Math.min(...ys) - pad
  const maxY = Math.max(...ys) + STROKE / 2
  return {
    dx: round(32 - (minX + maxX) / 2),
    dy: round(32 - (minY + maxY) / 2),
  }
}

export function markMarkup({ tines = 4 } = {}) {
  const part = layout(tines)
  const { dx, dy } = bounds(part)
  const arc = `M ${round(part.sx)} ${round(part.sy)} A ${R} ${R} 0 1 1 ${round(part.ex)} ${round(part.ey)}`
  const bar = `M ${round(part.sx - STROKE * 0.08)} ${round(part.sy)} L ${round(CX + BAR_IN)} ${round(part.sy)}`
  const neck = `M ${round(part.ex)} ${round(part.ey)} L ${round(part.neckEnd[0])} ${round(part.neckEnd[1])}`
  const palm = `M ${round(part.ex + part.dir[0] * 0.35)} ${round(part.ey + part.dir[1] * 0.35)} L ${round(part.palmEnd[0])} ${round(part.palmEnd[1])}`
  return `<g transform="translate(${dx} ${dy})">
    <path d="${arc}" fill="none" stroke="${CORAL}" stroke-width="${STROKE}" stroke-linecap="round"/>
    <path d="${bar}" fill="none" stroke="${CORAL}" stroke-width="${STROKE}" stroke-linecap="round"/>
    <path d="${neck}" fill="none" stroke="${CORAL}" stroke-width="${STROKE}" stroke-linecap="round"/>
    <path d="${palm}" fill="none" stroke="${CORAL}" stroke-width="${part.palmW}" stroke-linecap="round"/>
    <path d="${part.lines.join(' ')}" fill="none" stroke="${CORAL}" stroke-width="${part.tineW}" stroke-linecap="round"/>
  </g>`
}

export function tileSvg({ tines = 4, size = 64 } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Gusto's Guide">
  <rect width="64" height="64" rx="14" fill="${NAVY}"/>
  ${markMarkup({ tines })}
</svg>
`
}

export function markSvg({ tines = 4 } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" role="img" aria-label="Gusto's Guide">
  ${markMarkup({ tines })}
</svg>
`
}

/** Three heavier tines, drawn to stay separate at 16px. */
export function faviconSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Gusto's Guide">
  <rect width="32" height="32" rx="7" fill="${NAVY}"/>
  <g transform="translate(1.2 1.1) scale(0.46)">
    ${markMarkup({ tines: 3 })}
  </g>
</svg>
`
}

export function squareSvg({ tines = 4 } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="${NAVY}"/>
  ${markMarkup({ tines })}
</svg>
`
}
