/** Colors the iOS status bar to match the sticky header. Same values in dark mode: the header stays light. */
export const STATUS_NAVY = '#141F4D'
export const STATUS_CREAM = '#FFFAF3'

export type StatusBarTone = 'navy' | 'cream'

function sameColor(value: string, hex: string) {
  const parsed = toHex(value)
  return parsed === hex.toUpperCase()
}

/** iPad Safari keeps a tint until the sampled node is replaced, same as theme-color. */
function paintTopChrome(color: string) {
  const node = document.getElementById('top-chrome')
  if (!(node instanceof HTMLElement)) return
  if (node.dataset.color === color && sameColor(node.style.backgroundColor, color)) return
  const next = node.cloneNode(false) as HTMLElement
  next.dataset.color = color
  next.style.backgroundColor = color
  node.replaceWith(next)
}

export function setStatusBar(tone: StatusBarTone) {
  if (typeof document === 'undefined') return
  const color = tone === 'navy' ? STATUS_NAVY : STATUS_CREAM
  const root = document.documentElement
  const bar = document.querySelector('.site-header')
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  const chrome = document.getElementById('top-chrome')
  const barColored = bar instanceof HTMLElement && sameColor(bar.style.backgroundColor, color)
  const bodyColored = document.body ? sameColor(document.body.style.backgroundColor, color) : false
  const chromeColored = chrome instanceof HTMLElement && chrome.dataset.color === color
  let synced = root.dataset.status === tone && root.style.getPropertyValue('--status-bar') === color && barColored && bodyColored && chromeColored
  for (const node of metas) {
    if (node.getAttribute('content') !== color) synced = false
  }
  if (synced) return
  root.dataset.status = tone
  root.style.setProperty('--status-bar', color)
  root.style.backgroundColor = color
  if (document.body) document.body.style.backgroundColor = color
  paintTopChrome(color)
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
  // iPhone extends a fixed header's color into the status bar. iPad Safari does not: it tints
  // from the body background and from a fixed element on the top edge. #root keeps the page paper.
  const root = document.documentElement
  if (!sameColor(root.style.backgroundColor, color)) root.style.backgroundColor = color
  if (document.body && !sameColor(document.body.style.backgroundColor, color)) document.body.style.backgroundColor = color
  paintTopChrome(color)
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
  let frame = 0
  const schedule = () => {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
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
