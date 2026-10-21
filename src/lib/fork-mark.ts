export type ForkMetal = 'gold' | 'silver' | 'bronze' | 'navy'

const CREAM = '#fffaf3'
const CORAL = '#ff5330'
const NAVY = '#141f4d'

/** Two close stops. Enough to read as metal, not a shine. */
const DISC: Record<Exclude<ForkMetal, 'navy'>, [string, string, string, string]> = {
  gold: ['#f4de9e', '#d4a441', '#4a3012', '#a67c22'],
  silver: ['#f7f8fa', '#c5ced6', '#2c3540', '#8d98a4'],
  bronze: ['#f3d0b0', '#c4844e', '#4a2914', '#8a552c'],
}

/**
 * One filled silhouette: long thin tines, a curved shoulder, a narrow neck,
 * and a handle that widens a little into a round end. Rotated like flatware.
 * Tine width is the minimum that still separates at 24px.
 */
function forkShapes(fill: string): string {
  const tw = 5.2
  const gap = 4.4
  const count = 4
  const total = count * tw + (count - 1) * gap
  const x0 = 50 - total / 2
  const tip = 12
  const base = 46
  const neckY = 58
  const endY = 88
  const neck = 2.35
  const butt = 3.55
  const cap = tw / 2
  const outerR = x0 + total
  let d = `M ${50 - neck} ${neckY}`
  d += ` C ${50 - neck} ${neckY + 10}, ${50 - butt} ${endY - 14}, ${50 - butt} ${endY - butt}`
  d += ` A ${butt} ${butt} 0 0 0 ${50 + butt} ${endY - butt}`
  d += ` C ${50 + butt} ${endY - 14}, ${50 + neck} ${neckY + 10}, ${50 + neck} ${neckY}`
  d += ` C ${50 + neck + 7} ${neckY - 7}, ${outerR - 1} ${base + 7}, ${outerR} ${base}`
  const over = (right: number, left: number) => {
    const mid = (right + left) / 2
    return `L ${right} ${tip + cap} Q ${right} ${tip} ${mid} ${tip} Q ${left} ${tip} ${left} ${tip + cap} L ${left} ${base}`
  }
  d += over(outerR, outerR - tw)
  for (let i = count - 2; i >= 0; i -= 1) {
    const left = x0 + i * (tw + gap)
    const right = left + tw
    const gapRight = right + gap
    d += ` C ${gapRight} ${base + 3.6}, ${right} ${base + 3.6}, ${right} ${base}`
    d += over(right, left)
  }
  d += ` C ${x0 + 1} ${base + 7}, ${50 - neck - 7} ${neckY - 7}, ${50 - neck} ${neckY} Z`
  return `<path fill="${fill}" d="${d}"/>`
}

/** Circular medallion. Gold carries a small pink gem; Top 25 is flat navy and coral. */
export function forkSvg(metal: ForkMetal, options?: { id?: string; gem?: boolean }): string {
  const id = options?.id ?? metal
  const gem = metal === 'gold' && (options?.gem ?? true)
  const disc = metal === 'navy'
    ? `<circle cx="50" cy="50" r="46" fill="${NAVY}" stroke="${CREAM}" stroke-width="3"/>`
    : (() => {
        const [light, deep, , rim] = DISC[metal]
        return `<defs>
    <linearGradient id="${id}-disc" x1="50" y1="4" x2="50" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${light}"/>
      <stop offset="1" stop-color="${deep}"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="46" fill="url(#${id}-disc)" stroke="${rim}" stroke-width="2.5"/>`
      })()
  const fork = metal === 'navy' ? CORAL : DISC[metal][2]
  const gemMark = gem
    ? `<circle cx="50" cy="78" r="2.05" fill="#e23b78" stroke="#f0d078" stroke-width="0.55"/>
      <circle cx="49.3" cy="77.3" r="0.55" fill="#fff" opacity="0.9"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" aria-hidden="true" focusable="false">
  ${disc}
  <g transform="rotate(-30 50 50)">
    ${forkShapes(fork)}
    ${gemMark}
  </g>
</svg>`
}
