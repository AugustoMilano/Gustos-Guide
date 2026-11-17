import { useEffect, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'
import { restoreScrollWhenReady } from './scroll-restore.ts'

// Per history entry, so Back lands where the reader was and a fresh visit starts at the top.
const saved = new Map<string, number>()

function storageKey(key: string) {
  return `gusto.scroll.el.${key}`
}

/**
 * Remember and restore the scroll offset of an inner scroller (a collection list scrolls inside
 * .explore-scroll, not the window, so the window restore in App never saw it).
 */
export function useElementScrollRestore(ref: RefObject<HTMLElement | null>, ready: boolean) {
  const location = useLocation()
  const key = location.key
  useEffect(() => {
    const el = ref.current
    if (!el || !ready) return
    let target = saved.get(key)
    if (target == null) {
      try {
        const raw = sessionStorage.getItem(storageKey(key))
        if (raw) target = Number(raw) || 0
      } catch { /* storage off */ }
    }
    let restoring = Boolean(target && target > 0)
    let userMoved = false
    const onUser = () => { userMoved = true }
    const handle = restoring
      ? restoreScrollWhenReady({
        target: target ?? 0,
        read: () => ({ y: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }),
        write: (y) => { el.scrollTop = y },
        shouldCancel: () => userMoved,
        stableMs: 400,
        onDone: () => { restoring = false },
      })
      : null
    const onScroll = () => {
      if (restoring) return
      const y = Math.round(el.scrollTop)
      saved.set(key, y)
      try { sessionStorage.setItem(storageKey(key), String(y)) } catch { /* storage off */ }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onUser, { passive: true })
    el.addEventListener('touchmove', onUser, { passive: true })
    return () => {
      handle?.stop()
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onUser)
      el.removeEventListener('touchmove', onUser)
    }
  }, [ref, key, ready])
}
