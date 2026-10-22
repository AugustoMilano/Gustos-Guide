/** Colors the iOS status bar to match the sticky header. Same values in dark mode: the header stays light. */
export const STATUS_NAVY = '#141F4D'
export const STATUS_CREAM = '#FFFAF3'

export type StatusBarTone = 'navy' | 'cream'

export function setStatusBar(tone: StatusBarTone) {
  if (typeof document === 'undefined') return
  const color = tone === 'navy' ? STATUS_NAVY : STATUS_CREAM
  const root = document.documentElement
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  let synced = root.dataset.status === tone && root.style.backgroundColor !== ''
  for (const node of metas) {
    if (node.getAttribute('content') !== color) synced = false
  }
  if (synced) return
  root.dataset.status = tone
  root.style.backgroundColor = color
  for (const node of metas) node.setAttribute('content', color)
}
