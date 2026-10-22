import { useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { areaTitle, areasFor, cityPath } from '../lib/city.ts'
import { useCityId } from '../lib/use-city-id.ts'

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

/** Solid accent pill on the selected area. One control, in the header on every width. */
export function CitySwitcher() {
  const city = useCityId()
  const navigate = useNavigate()
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
    <div ref={bar} className="city-switch city-switch-bar" role="group" aria-label={`Area, ${areaTitle(city)} selected`}>
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
              if (!on) navigate(cityPath('/', item.id))
            }}
          >
            {on ? (
              <motion.span
                layoutId="city-pill"
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
