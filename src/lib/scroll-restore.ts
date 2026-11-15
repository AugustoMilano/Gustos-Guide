/** Pixel slack when deciding whether a restored offset or anchor is close enough. */
export const SCROLL_RESTORE_SLACK = 20
/** Keep adjusting until the list is tall enough, or this long has passed. */
export const SCROLL_RESTORE_TIMEOUT_MS = 8000

export type ScrollMetrics = { y: number; scrollHeight: number; clientHeight: number }

export type ScrollMark = {
  y: number
  selector?: string
  top?: number
}

export type AnchorBox = { top: number }

export function maxScrollY(scrollHeight: number, clientHeight: number): number {
  return Math.max(0, Math.floor(scrollHeight - clientHeight))
}

/** True when the document can already reach this offset, within slack. */
export function canHonorScroll(
  target: number,
  scrollHeight: number,
  clientHeight: number,
  slack = SCROLL_RESTORE_SLACK,
): boolean {
  if (target <= 0) return true
  return maxScrollY(scrollHeight, clientHeight) >= target - slack
}

/** Keep the last real offset when the browser has already reset the page to 0. */
export function captureScroll(currentY: number, lastY: number): number {
  return currentY > 0 ? currentY : lastY
}

export function captureMark(current: ScrollMark, last: ScrollMark): ScrollMark {
  return current.y > 0 ? current : last
}

export function applyWindowScroll(y: number) {
  const root = document.documentElement
  const previous = root.style.scrollBehavior
  root.style.scrollBehavior = 'auto'
  const scrolling = document.scrollingElement
  if (scrolling) scrolling.scrollTop = y
  window.scrollTo(0, y)
  root.style.scrollBehavior = previous
}

export function readWindowScroll(): ScrollMetrics {
  const scrolling = document.scrollingElement ?? document.documentElement
  return {
    y: scrolling.scrollTop || window.scrollY || 0,
    scrollHeight: scrolling.scrollHeight,
    clientHeight: scrolling.clientHeight || window.innerHeight,
  }
}

export function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value)
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`)
}

export function selectorFor(node: Element): string | null {
  if (node.id) return `#${cssEscape(node.id)}`
  if (node instanceof HTMLAnchorElement) {
    const href = node.getAttribute('href')
    if (href) return `a[href="${cssEscape(href)}"]`
  }
  return null
}

const ANCHOR_CANDIDATES = 'main article[id], main a.top-row, main a.top-podium-card, main a[href*="/place/"]'

/** Pick a visible list row near the top of the viewport, so later layout shifts can be corrected. */
export function readScrollMark(
  metrics: ScrollMetrics = readWindowScroll(),
  find: (selector: string) => Iterable<Element> = defaultQuery,
): ScrollMark {
  const line = 96
  const viewH = metrics.clientHeight
  let best: { selector: string; top: number; score: number } | null = null
  for (const node of find(ANCHOR_CANDIDATES)) {
    const selector = selectorFor(node)
    if (!selector) continue
    const box = node.getBoundingClientRect()
    if (box.bottom <= line || box.top >= viewH) continue
    const score = box.top >= line ? box.top - line : line - box.top + 10_000
    if (!best || score < best.score) best = { selector, top: box.top, score }
  }
  return best ? { y: metrics.y, selector: best.selector, top: best.top } : { y: metrics.y }
}

function defaultQuery(selector: string): Iterable<Element> {
  return document.querySelectorAll(selector)
}

export type RestoreScrollOptions = {
  target: number | ScrollMark
  read: () => ScrollMetrics
  write: (y: number) => void
  locate?: (selector: string) => AnchorBox | null
  subscribe?: (onChange: () => void) => () => void
  now?: () => number
  timeoutMs?: number
  stableMs?: number
  slack?: number
  shouldCancel?: () => boolean
  isBusy?: () => boolean
  onDone?: (y: number) => void
}

export type ScrollRestoreHandle = {
  stop: () => void
  tryOnce: () => boolean
}

function asMark(target: number | ScrollMark): ScrollMark {
  return typeof target === 'number' ? { y: target } : target
}

/**
 * Restore a saved window offset, retrying until the document is tall enough
 * (lists often paint a short skeleton first) or the timeout is reached.
 * When an anchor row is known, keep that row at the same viewport position
 * as images and late content change the page height.
 */
export function restoreScrollWhenReady(options: RestoreScrollOptions): ScrollRestoreHandle {
  const mark = asMark(options.target)
  const timeoutMs = options.timeoutMs ?? SCROLL_RESTORE_TIMEOUT_MS
  const stableMs = options.stableMs ?? 800
  const slack = options.slack ?? SCROLL_RESTORE_SLACK
  const now = options.now ?? (() => Date.now())
  const started = now()
  let stopped = false
  let stableSince: number | null = null
  let unsubscribe: (() => void) | undefined

  const finish = (y: number) => {
    if (stopped) return
    stopped = true
    unsubscribe?.()
    options.onDone?.(y)
  }

  const tryOnce = () => {
    if (stopped) return true
    if (options.shouldCancel?.()) {
      finish(options.read().y)
      return true
    }
    const metrics = options.read()
    if (mark.y <= 0 && !mark.selector) {
      options.write(0)
      finish(0)
      return true
    }
    let applied = Math.min(mark.y, maxScrollY(metrics.scrollHeight, metrics.clientHeight))
    const tallEnough = canHonorScroll(mark.y, metrics.scrollHeight, metrics.clientHeight, slack)
    if (tallEnough) {
      if (Math.abs(metrics.y - mark.y) > 1) options.write(mark.y)
      applied = mark.y
    } else if (mark.selector && mark.top != null && options.locate) {
      const box = options.locate(mark.selector)
      if (box) {
        const delta = box.top - mark.top
        applied = metrics.y + delta
        if (Math.abs(delta) > 1) options.write(applied)
      } else if (applied > 0 && Math.abs(metrics.y - applied) > 1) {
        options.write(applied)
      }
    } else if (applied > 0 && Math.abs(metrics.y - applied) > 1) {
      options.write(applied)
    }
    const honored = tallEnough && !options.isBusy?.()
    if (honored) {
      if (stableSince == null) stableSince = now()
      if (now() - stableSince >= stableMs) {
        finish(applied)
        return true
      }
      return false
    }
    stableSince = null
    if (now() - started >= timeoutMs) {
      finish(applied)
      return true
    }
    return false
  }

  if (!tryOnce()) {
    const subscribe = options.subscribe ?? subscribeToLayout
    unsubscribe = subscribe(() => {
      tryOnce()
    })
  }

  return {
    stop: () => finish(options.read().y),
    tryOnce,
  }
}

export function locateInWindow(selector: string): AnchorBox | null {
  const node = document.querySelector(selector)
  if (!node) return null
  return { top: node.getBoundingClientRect().top }
}

/** Watch layout, images, and frames so a late list render can be scrolled into place. */
export function subscribeToLayout(onChange: () => void) {
  let frame = requestAnimationFrame(function tick() {
    onChange()
    frame = requestAnimationFrame(tick)
  })
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(onChange) : null
  if (ro) ro.observe(document.documentElement)
  const mo = typeof MutationObserver === 'function' ? new MutationObserver(onChange) : null
  if (mo && document.body) mo.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', onChange)
  window.addEventListener('load', onChange)
  document.addEventListener('readystatechange', onChange)
  return () => {
    cancelAnimationFrame(frame)
    ro?.disconnect()
    mo?.disconnect()
    window.removeEventListener('resize', onChange)
    window.removeEventListener('load', onChange)
    document.removeEventListener('readystatechange', onChange)
  }
}

/** True when an image above the saved offset is still loading and may still grow the page. */
export function imagesAffectingScroll(targetY: number): boolean {
  const cutoff = targetY + 80
  for (const node of document.querySelectorAll('main img')) {
    if (!(node instanceof HTMLImageElement) || node.complete) continue
    const top = node.getBoundingClientRect().top + (window.scrollY || 0)
    if (top <= cutoff) return true
  }
  return false
}
