import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

export type OrderRow = { id: string; name: string; detail: string }

type Drag = { id: string; from: number; startY: number; startScroll: number; rects: DOMRect[]; step: number; pointer: number }

/**
 * Reorder a guide for yourself. Drag the handle (mouse, pen, or finger), or use the up and down
 * buttons, or focus a handle and press the arrow keys. Nothing saves until Save order.
 */
export function MyOrderEditor({ rows, onSave, onCancel }: { rows: OrderRow[]; onSave: (ids: string[]) => void; onCancel: () => void }) {
  const [ids, setIds] = useState(() => rows.map((row) => row.id))
  const [drag, setDrag] = useState<Drag | null>(null)
  const [dy, setDy] = useState(0)
  const [over, setOver] = useState<number | null>(null)
  const [announce, setAnnounce] = useState('')
  const items = useRef(new Map<string, HTMLLIElement>())
  const handles = useRef(new Map<string, HTMLButtonElement>())
  const lastY = useRef(0)
  const root = useRef<HTMLElement>(null)
  useEffect(() => { root.current?.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }) }, [])
  const byId = new Map(rows.map((row) => [row.id, row]))
  const changed = ids.some((id, index) => id !== rows[index]?.id)

  function move(from: number, to: number, focusId?: string) {
    if (from === to || to < 0 || to >= ids.length) return
    const next = ids.slice()
    const [picked] = next.splice(from, 1)
    next.splice(to, 0, picked)
    setIds(next)
    setAnnounce(`${byId.get(picked)?.name ?? 'Place'} moved to ${to + 1} of ${next.length}.`)
    if (focusId) requestAnimationFrame(() => handles.current.get(focusId)?.focus())
  }

  function targetFor(state: Drag, offset: number) {
    const rect = state.rects[state.from]
    const center = rect.top + rect.height / 2 + offset
    let to = state.from
    state.rects.forEach((other, index) => {
      const mid = other.top + other.height / 2
      if (index < state.from && center < mid) to = Math.min(to, index)
      if (index > state.from && center > mid) to = Math.max(to, index)
    })
    return to
  }

  function onDown(event: PointerEvent<HTMLButtonElement>, id: string, index: number) {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rects = ids.map((key) => items.current.get(key)?.getBoundingClientRect() ?? new DOMRect())
    const gap = rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 8
    lastY.current = event.clientY
    setDrag({ id, from: index, startY: event.clientY, startScroll: window.scrollY, rects, step: rects[index].height + gap, pointer: event.pointerId })
    setDy(0)
    setOver(index)
  }

  function onMove(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointer) return
    lastY.current = event.clientY
    const offset = event.clientY - drag.startY + (window.scrollY - drag.startScroll)
    setDy(offset)
    setOver(targetFor(drag, offset))
  }

  function onUp(event: PointerEvent<HTMLButtonElement>) {
    if (!drag || event.pointerId !== drag.pointer) return
    const to = over ?? drag.from
    const id = drag.id
    setDrag(null)
    setDy(0)
    setOver(null)
    move(drag.from, to, id)
  }

  // Keep scrolling while a finger holds a row near the top or bottom edge.
  useEffect(() => {
    if (!drag) return
    let frame = 0
    const tick = () => {
      const y = lastY.current
      const edge = 90
      const speed = y < edge ? -Math.ceil((edge - y) / 6) : y > window.innerHeight - edge ? Math.ceil((y - (window.innerHeight - edge)) / 6) : 0
      if (speed) {
        window.scrollBy(0, speed)
        const offset = y - drag.startY + (window.scrollY - drag.startScroll)
        setDy(offset)
        setOver(targetFor(drag, offset))
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  function shiftFor(index: number) {
    if (!drag || over == null || index === drag.from) return 0
    if (drag.from < over && index > drag.from && index <= over) return -drag.step
    if (drag.from > over && index < drag.from && index >= over) return drag.step
    return 0
  }

  function onKey(event: KeyboardEvent<HTMLButtonElement>, id: string, index: number) {
    if (event.key === 'ArrowUp') { event.preventDefault(); move(index, index - 1, id) }
    if (event.key === 'ArrowDown') { event.preventDefault(); move(index, index + 1, id) }
  }

  return (
    <section ref={root} className="my-order-editor" aria-labelledby="my-order-edit-title" data-my-order-editor>
      <div className="my-order-editor-head">
        <h2 id="my-order-edit-title" className="font-serif text-2xl italic">Edit my order</h2>
        <p className="text-sm">Drag the handle, or use the arrows. Only you see this order.</p>
      </div>
      <ol className={`my-order-list${drag ? ' is-dragging' : ''}`}>
        {ids.map((id, index) => {
          const row = byId.get(id)
          if (!row) return null
          const lifted = drag?.id === id
          return (
            <li
              key={id}
              ref={(node) => { if (node) items.current.set(id, node); else items.current.delete(id) }}
              className={`my-order-row${lifted ? ' is-lifted' : ''}`}
              style={{ transform: `translateY(${lifted ? dy : shiftFor(index)}px)` }}
              data-place-id={id}
            >
              <button
                ref={(node) => { if (node) handles.current.set(id, node); else handles.current.delete(id) }}
                type="button"
                className="my-order-handle"
                aria-label={`Move ${row.name}. Drag, or press up or down arrow.`}
                aria-roledescription="drag handle"
                onPointerDown={(event) => onDown(event, id, index)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onKeyDown={(event) => onKey(event, id, index)}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><g fill="currentColor"><circle cx="6" cy="4" r="1.6" /><circle cx="12" cy="4" r="1.6" /><circle cx="6" cy="9" r="1.6" /><circle cx="12" cy="9" r="1.6" /><circle cx="6" cy="14" r="1.6" /><circle cx="12" cy="14" r="1.6" /></g></svg>
              </button>
              <span className="my-order-num" aria-hidden="true">{index + 1}</span>
              <span className="my-order-name">
                <span className="block font-bold leading-tight">{row.name}</span>
                <span className="block text-xs">{row.detail}</span>
              </span>
              <span className="my-order-steps">
                <button type="button" className="my-order-step" aria-label={`Move ${row.name} up`} disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
                <button type="button" className="my-order-step" aria-label={`Move ${row.name} down`} disabled={index === ids.length - 1} onClick={() => move(index, index + 1)}>↓</button>
              </span>
            </li>
          )
        })}
      </ol>
      <p className="sr-only" role="status" aria-live="polite">{announce}</p>
      <div className="my-order-actions">
        <button type="button" className="btn btn-coral" onClick={() => onSave(ids)} disabled={!changed}>Save order</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  )
}
