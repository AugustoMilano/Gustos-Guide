import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CITIES, cityPath } from '../lib/city.ts'
import { useCityId } from '../lib/use-city.ts'

/** Glass segmented control. The header copy hides below 640px; the menu copy is for phones. */
export function CitySwitcher({ layoutId = 'city-pill' }: { layoutId?: string }) {
  const city = useCityId()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const inMenu = layoutId !== 'city-pill'
  return (
    <div className={inMenu ? 'city-switch city-switch-menu' : 'city-switch city-switch-bar'} role="group" aria-label="Area">
      {CITIES.filter((item) => item.ready).map((item) => {
        const on = item.id === city
        return (
          <button
            key={item.id}
            type="button"
            className="city-switch-btn"
            aria-pressed={on}
            onClick={() => navigate(cityPath('/', item.id))}
          >
            {on ? (
              <motion.span
                layoutId={layoutId}
                className="city-switch-glint"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}
              />
            ) : null}
            <span className="relative">{item.name}</span>
          </button>
        )
      })}
    </div>
  )
}
