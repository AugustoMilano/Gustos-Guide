import { cougArea, installCougEggs } from './coug.ts'

/** Colors the iOS status bar to match the sticky header. Same values in dark mode: the header stays light. */
export const STATUS_NAVY = '#141F4D'
export const STATUS_CREAM = '#FFFAF3'
/** Pullman, WA wears crimson instead of navy (Coug game days). */
export const STATUS_CRIMSON = '#981E32'

/** Marks the open area on <html> so region themes can scope their CSS. */
export function syncArea(): string {
  if (typeof document === 'undefined') return ''
  const m = (window.location.hash.replace(/^#/, '') || '/').match(/^\/([a-z]+)(?=\/|$)/)
  const area = m ? m[1] : ''
  const root = document.documentElement
  if (root.dataset.area !== area) {
    root.dataset.area = area
    cougArea(area)
  }
  return area
}

export type StatusBarTone = 'navy' | 'cream'

export function setStatusBar(tone: StatusBarTone) {
  if (typeof document === 'undefined') return
  const color = tone === 'navy' ? (syncArea() === 'pullman' ? STATUS_CRIMSON : STATUS_NAVY) : STATUS_CREAM
  const root = document.documentElement
  const bar = document.querySelector('.site-header')
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  const barColored = bar instanceof HTMLElement && bar.style.backgroundColor !== ''
  let synced = root.dataset.status === tone && root.style.getPropertyValue('--status-bar') === color && barColored
  for (const node of metas) {
    if (node.getAttribute('content') !== color) synced = false
  }
  if (synced) return
  root.dataset.status = tone
  root.style.setProperty('--status-bar', color)
  root.style.backgroundColor = color
  if (bar instanceof HTMLElement) {
    bar.style.backgroundColor = color
    bar.style.backdropFilter = 'none'
    bar.style.setProperty('-webkit-backdrop-filter', 'none')
  }
  for (const node of metas) node.setAttribute('content', color)
}

function toHex(color: string): string | null {
  const m = color.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)/i)
  if (!m) return /^#[0-9a-f]{6}$/i.test(color) ? color.toUpperCase() : null
  if (m[4] !== undefined && parseFloat(m[4]) === 0) return null
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase()
}

let lastThemeColor = ''

/** Sets theme-color, and the html background to the header's computed background. */
export function syncThemeColor() {
  if (typeof document === 'undefined') return
  const bar = document.querySelector('.site-header')
  if (!(bar instanceof HTMLElement)) return
  const color = toHex(getComputedStyle(bar).backgroundColor)
  if (!color) return
  // Safari 26 tints its top bar from the root background and a fixed element at the top edge.
  // Mirror the header onto html only (never body).
  const root = document.documentElement
  if (root.style.backgroundColor !== color) root.style.backgroundColor = color
  const fresh = color === lastThemeColor
  lastThemeColor = color
  for (const node of document.querySelectorAll('meta[name="theme-color"]')) {
    if (fresh && node instanceof HTMLMetaElement && node.dataset.synced === '1' && node.content.toUpperCase() === color) continue
    // Safari can ignore attribute edits on a live theme-color tag; re-insert a fresh node.
    const next = node.cloneNode() as HTMLMetaElement
    next.setAttribute('content', color)
    next.dataset.synced = '1'
    node.replaceWith(next)
  }
}

let watching = false
/** Re-syncs theme-color on header class/style changes, scroll, resize, and hash routes. */
export function watchThemeColor() {
  if (watching || typeof window === 'undefined') return
  watching = true
  installCougEggs()
  let frame = 0
  const schedule = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      syncArea()
      syncThemeColor()
    })
  }
  const bar = document.querySelector('.site-header')
  if (bar) new MutationObserver(schedule).observe(bar, { attributes: true, attributeFilter: ['class', 'style'] })
  for (const type of ['scroll', 'resize', 'hashchange', 'popstate', 'pageshow']) {
    window.addEventListener(type, schedule, { passive: true })
  }
  schedule()
}
