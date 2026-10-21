// Geometric Gusto mark. A capital G in one rounded stroke, crossbar at the
// right middle, and the top of the arc leaving into a fork. Not traced from art.

export const NAVY = '#141F4D'
export const CORAL = '#FF5330'
export const CREAM = '#EEE3D6'

const CX = 22.4
const CY = 39.2
const R = 12.6
const FORK_DEG = 98
const STROKE = 4.8
const BAR_IN = 2.8

function onCircle(deg) {
  const rad = (deg * Math.PI) / 180
  return [CX + R * Math.cos(rad), CY - R * Math.sin(rad)]
}

function tangent(deg) {
  const rad = (deg * Math.PI) / 180
  const x = Math.sin(rad)
  const y = Math.cos(rad)
  const len = Math.hypot(x, y)
  return [x / len, y / len]
}

function round(n) {
  return Math.round(n * 100) / 100
}

function fork(tines) {
  const [ex, ey] = onCircle(FORK_DEG)
  const [tx, ty] = tangent(FORK_DEG)
  const neck = 1.6
  const palmX = ex + tx * neck
  const palmY = ey + ty * neck
  const pitch = tines === 3 ? 8.4 : 7
  const length = tines === 3 ? 10 : 11
  const nx = -ty
  const ny = tx
  const lines = []
  const tips = []
  for (let i = 0; i < tines; i += 1) {
    const offset = (i - (tines - 1) / 2) * pitch
    const x0 = palmX + nx * offset
    const y0 = palmY + ny * offset
    const x1 = x0 + tx * length
    const y1 = y0 + ty * length
    lines.push(`M ${round(x0)} ${round(y0)} L ${round(x1)} ${round(y1)}`)
    tips.push([x0, y0], [x1, y1])
  }
  return { lines, palmX, palmY, ex, ey, tips }
}

function markBounds(tines, stroke) {
  const pts = []
  for (let deg = 0; deg >= FORK_DEG - 360; deg -= 2) pts.push(onCircle(((deg % 360) + 360) % 360))
  const head = fork(tines)
  pts.push([head.ex, head.ey], [head.palmX, head.palmY], ...head.tips)
  const [sx, sy] = onCircle(0)
  pts.push([sx, sy], [CX + BAR_IN, sy])
  const pad = stroke / 2
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const minX = Math.min(...xs) - pad
  const maxX = Math.max(...xs) + pad
  const minY = Math.min(...ys) - pad
  const maxY = Math.max(...ys) + pad
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 }
}

/** Bowl and fork neck. The crossbar is its own spur so the join does not bulge past the bowl. */
export function spinePath() {
  const [sx, sy] = onCircle(0)
  const { ex, ey, palmX, palmY } = fork(4)
  return `M ${round(sx)} ${round(sy)} A ${R} ${R} 0 1 1 ${round(ex)} ${round(ey)} L ${round(palmX)} ${round(palmY)}`
}

export function barPath() {
  const [sx, sy] = onCircle(0)
  const innerX = CX + BAR_IN
  return `M ${round(sx)} ${round(sy)} L ${round(innerX)} ${round(sy)}`
}

export function tinePaths(tines) {
  return fork(tines).lines
}

export function smallMarkMarkup() {
  const stroke = 4.35
  const tines = 3
  const [ex, ey] = onCircle(FORK_DEG)
  const [tx, ty] = tangent(FORK_DEG)
  const palmX = ex + tx * 1.6
  const palmY = ey + ty * 1.6
  const pitch = 8.4
  const length = 7.6
  const nx = -ty
  const ny = tx
  const lines = []
  const tips = [[ex, ey], [palmX, palmY]]
  for (let i = 0; i < tines; i += 1) {
    const offset = (i - 1) * pitch
    const x0 = palmX + nx * offset
    const y0 = palmY + ny * offset
    const x1 = x0 + tx * length
    const y1 = y0 + ty * length
    lines.push(`M ${round(x0)} ${round(y0)} L ${round(x1)} ${round(y1)}`)
    tips.push([x0, y0], [x1, y1])
  }
  const [sx, sy] = onCircle(0)
  const innerX = CX + 1.4
  tips.push([sx, sy], [innerX, sy])
  for (let deg = 0; deg >= FORK_DEG - 360; deg -= 4) tips.push(onCircle(((deg % 360) + 360) % 360))
  const pad = stroke / 2
  const minX = Math.min(...tips.map((p) => p[0])) - pad
  const maxX = Math.max(...tips.map((p) => p[0])) + pad
  const minY = Math.min(...tips.map((p) => p[1])) - pad
  const maxY = Math.max(...tips.map((p) => p[1])) + pad
  const dx = round(32 - (minX + maxX) / 2)
  const dy = round(32 - (minY + maxY) / 2)
  const spine = `M ${round(sx)} ${round(sy)} A ${R} ${R} 0 1 1 ${round(ex)} ${round(ey)} L ${round(palmX)} ${round(palmY)}`
  const bar = `M ${round(sx)} ${round(sy)} L ${round(innerX)} ${round(sy)}`
  return `<g transform="translate(${dx} ${dy})" fill="none" stroke="${CORAL}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${spine}"/>
    <path d="${bar}"/>
    <path d="${lines.join(' ')}"/>
  </g>`
}

export function markMarkup({ tines = 4, stroke = STROKE } = {}) {
  const spine = spinePath()
  const tinesD = tinePaths(tines).join(' ')
  const box = markBounds(tines, stroke)
  const dx = round(32 - box.cx)
  const dy = round(32 - box.cy + 0.2)
  return `<g transform="translate(${dx} ${dy})" fill="none" stroke="${CORAL}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${spine}"/>
    <path d="${barPath()}"/>
    <path d="${tinesD}"/>
  </g>`
}

export function tileSvg({ tines = 4, size = 64, small = false } = {}) {
  const radius = 14
  const mark = small ? smallMarkMarkup() : markMarkup({ tines })
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Gusto's Guide">
  <rect width="64" height="64" rx="${radius}" fill="${NAVY}"/>
  ${mark}
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

/** Three tines and a heavier bowl, so the mark still reads at 16px. */
export function faviconSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Gusto's Guide">
  <rect width="32" height="32" rx="7" fill="${NAVY}"/>
  <circle cx="13.2" cy="19.2" r="8.6" fill="${CORAL}"/>
  <circle cx="13.2" cy="19.2" r="4.7" fill="${NAVY}"/>
  <path d="M13.2 10.6h12.2V16.4H17.2c-1.2 0-2.2-1-2.2-2.2V10.6z" fill="${NAVY}"/>
  <rect x="13.2" y="16.15" width="8.4" height="3.35" rx="1.67" fill="${CORAL}"/>
  <path d="M16.6 14.2c1.2-1.6 2.4-2.6 3.8-3.2" fill="none" stroke="${CORAL}" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="19.2" y="4.15" width="9.2" height="2.35" rx="1.17" fill="${CORAL}"/>
  <rect x="20.1" y="8.05" width="9.2" height="2.35" rx="1.17" fill="${CORAL}"/>
  <rect x="20.6" y="11.95" width="8.2" height="2.35" rx="1.17" fill="${CORAL}"/>
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
