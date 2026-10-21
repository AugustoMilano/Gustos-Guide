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
 * Classic dinner fork, symmetric, built from straight tines and a pill handle
 * so the silhouette stays legible inside a 24px coin.
 */
function forkShapes(fill: string): string {
  const tine = (x: number) => `<rect x="${x}" y="15" width="8" height="34" rx="4" fill="${fill}"/>`
  return `
    ${tine(26.5)}
    ${tine(39.5)}
    ${tine(52.5)}
    ${tine(65.5)}
    <rect x="24" y="40" width="52" height="14" rx="5" fill="${fill}"/>
    <path fill="${fill}" d="M34 48h32l-8 18h-16z"/>
    <path fill="${fill}" d="M44 60h12v16q0 10-6 10t-6-10z"/>
  `
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
    ? `<circle cx="50" cy="70" r="2.6" fill="#e23b78" stroke="#f0d078" stroke-width="0.7"/>
      <circle cx="49.2" cy="69.2" r="0.7" fill="#fff" opacity="0.9"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" aria-hidden="true" focusable="false">
  ${disc}
  ${forkShapes(fork)}
  ${gemMark}
</svg>`
}
