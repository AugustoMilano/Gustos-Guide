import { useEffect, useRef } from 'react'
import { m, useReducedMotion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { areaTitle, areasFor, cityPath } from '../lib/city.ts'
import { useCityId } from '../lib/use-city-id.ts'

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

/** Solid accent pill on the selected area. One control, in the header on every width. */
export function CitySwitcher({ inline = false }: { inline?: boolean } = {}) {
  const city = useCityId()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // A profile stays open when the area changes, so its Top 10 follows the switcher.
  const profile = pathname.match(/\/u\/[^/]+\/?$/)?.[0]
  const reduce = useReducedMotion()
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = bar.current
    const selected = root?.querySelector('[aria-pressed="true"]')
    if (!root || !(selected instanceof HTMLElement)) return
    const left = selected.offsetLeft - (root.clientWidth - selected.offsetWidth) / 2
    root.scrollTo({ left: Math.max(0, left), behavior: 'auto' })
  }, [city])
  return (
    <div ref={bar} className={inline ? 'city-switch city-switch-inline' : 'city-switch city-switch-bar'} role="group" aria-label={inline ? `Top 10 area, ${areaTitle(city)} selected` : `Area, ${areaTitle(city)} selected`}>
      {areasFor(city).filter((item) => item.ready).map((item) => {
        const on = item.id === city
        return (
          <button
            key={item.id}
            type="button"
            className="city-switch-btn"
            aria-pressed={on}
            aria-current={on ? 'true' : undefined}
            onClick={() => {
              if (!on) navigate(cityPath(profile ?? '/', item.id), inline ? { replace: true, state: { keepScroll: true } } : undefined)
            }}
          >
            {on ? (
              <m.span
                layoutId={inline ? 'city-pill-inline' : 'city-pill'}
                className="city-switch-glint"
                transition={reduce ? { duration: 0 } : SPRING}
              />
            ) : null}
            <span className="city-switch-label">
              <span className="city-mark" aria-hidden="true" />
              {item.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
