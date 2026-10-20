import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { REGIONS, readRegionMemory, writeRegionMemory, type RegionId } from '../lib/city.ts'
import { usePageMeta } from '../lib/meta.ts'

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

export function CitiesPage() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const memory = readRegionMemory()
  usePageMeta(
    "Choose a city · Gusto's Guide",
    'Seattle covers the city and the Eastside. Los Angeles is the other list.',
  )

  function open(region: RegionId) {
    const area = region === 'la' ? 'la' : memory.region === 'seattle' ? memory.area : 'seattle'
    writeRegionMemory(area)
    navigate(area === 'la' ? '/la' : area === 'eastside' ? '/eastside' : '/seattle')
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 pb-16 outline-none">
      <p className="area-kicker">Gusto's Guide</p>
      <h1 className="mt-2 font-serif text-6xl italic">Choose a city</h1>
      <p className="mt-3 max-w-xl">
        Seattle includes the Eastside, with the coral switch once you are inside. Los Angeles is its own list. The city you opened last is marked.
      </p>
      <div className="mt-6 grid gap-3">
        {REGIONS.map((region, index) => {
          const on = memory.region === region.id
          return (
            <motion.button
              key={region.id}
              type="button"
              className="city-card"
              aria-current={on ? 'true' : undefined}
              onClick={() => open(region.id)}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { ...SPRING, delay: index * 0.05 }}
            >
              <span className="min-w-0 text-left">
                <span className="block font-serif text-4xl italic leading-none">{region.name}</span>
                <span className="mt-2 block text-sm">{region.detail}</span>
              </span>
              <span className={`city-card-mark${on ? ' is-on' : ''}`}>{on ? 'Last opened' : 'Open'}</span>
            </motion.button>
          )
        })}
      </div>
    </main>
  )
}
