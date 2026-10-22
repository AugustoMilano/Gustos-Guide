/** Colors the iOS status bar to match the sticky header. Same values in dark mode: the header stays light. */
export const STATUS_NAVY = '#141F4D'
export const STATUS_CREAM = '#FFFAF3'

export type StatusBarTone = 'navy' | 'cream'

export function setStatusBar(tone: StatusBarTone) {
  if (typeof document === 'undefined') return
  const color = tone === 'navy' ? STATUS_NAVY : STATUS_CREAM
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
