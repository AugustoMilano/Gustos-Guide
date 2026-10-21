export type ForkMetal = 'gold' | 'silver' | 'bronze' | 'brushed'

const STOPS: Record<ForkMetal, [string, string, string, string, string]> = {
  gold: ['#fff8e4', '#f0d078', '#c4922e', '#8a6416', '#f6e2a8'],
  silver: ['#ffffff', '#d5dde6', '#9aa6b4', '#6e7a88', '#eef3f8'],
  bronze: ['#f8e0cc', '#e0a36a', '#b86a32', '#7a4120', '#f0c49a'],
  brushed: ['#efe0bc', '#c6a15a', '#a07d3b', '#7a5c28', '#ddc48a'],
}

/** Flame-tined fork. One filled shape, shared by the badge and the story canvas. */
export function forkSvg(metal: ForkMetal, options?: { id?: string; gem?: boolean }): string {
  const id = options?.id ?? metal
  const gem = options?.gem ?? metal === 'gold'
  const [a, b, c, d, e] = STOPS[metal]
  const shape = `
    <path d="M37 98h6V68h-6z"/>
    <path d="M28 70h24v4.2c0 1.2-1.2 2-2.2 2H30.2c-1 0-2.2-.8-2.2-2z"/>
    <path d="M16 66h4.2V40h-4.2z"/>
    <path d="M30 66h4.2V34h-4.2z"/>
    <path d="M44 66h4.2V26h-4.2z"/>
    <path d="M58 66h4.2V38h-4.2z"/>
    <path d="M14.2 42c-6-6-8-16-4-22 3-4 8-2 8 4 0 6-1 12-2 18h-2z"/>
    <path d="M28.2 36c-4-8-2-18 2-24 3-4 8-1 7 5-1 8-4 14-7 19h-2z"/>
    <path d="M42.2 28c-2-10 2-22 8-26 4-3 8 1 6 6-2 8-8 16-12 20h-2z"/>
    <path d="M56.2 40c2-8 10-16 16-16 4 0 6 4 3 8-4 6-12 12-17 16h-2z"/>
  `
  const brush = metal === 'brushed'
    ? `<pattern id="${id}-brush" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="1.15" fill="#fff" opacity="0.38"/><rect y="1.5" width="3" height="1.15" fill="#3a2a12" opacity="0.16"/></pattern>`
    : ''
  const gemMark = gem
    ? `<radialGradient id="${id}-gem" cx="38%" cy="32%" r="70%">
        <stop offset="0" stop-color="#ffe4ee"/>
        <stop offset="0.45" stop-color="#e23b78"/>
        <stop offset="1" stop-color="#8e123f"/>
      </radialGradient>
      <ellipse cx="40" cy="72" rx="4.6" ry="5.6" fill="url(#${id}-gem)" stroke="#f0d078" stroke-width="0.7"/>
      <circle cx="40" cy="65.2" r="1.15" fill="#f0d078"/>
      <circle cx="34.6" cy="72" r="1.15" fill="#f0d078"/>
      <circle cx="45.4" cy="72" r="1.15" fill="#f0d078"/>
      <circle cx="40" cy="78.6" r="1.15" fill="#f0d078"/>
      <ellipse cx="38.4" cy="69.6" rx="1.2" ry="1.6" fill="#fff" opacity="0.75"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" width="80" height="100" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${id}-metal" x1="18%" y1="0%" x2="82%" y2="100%">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="0.28" stop-color="${b}"/>
      <stop offset="0.55" stop-color="${c}"/>
      <stop offset="0.78" stop-color="${d}"/>
      <stop offset="1" stop-color="${e}"/>
    </linearGradient>
    ${brush}
    <g id="${id}-shape">${shape}</g>
  </defs>
  <use href="#${id}-shape" fill="url(#${id}-metal)"/>
  ${brush ? `<use href="#${id}-shape" fill="url(#${id}-brush)"/>` : ''}
  ${gemMark}
</svg>`
}
