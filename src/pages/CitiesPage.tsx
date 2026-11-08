import { m, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cityPath, readRegionMemory, REGIONS, writeRegionMemory, type RegionId } from '../lib/city.ts'
import { usePageMeta } from '../lib/meta.ts'

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 32 }

export function CitiesPage({ landing = false }: { landing?: boolean } = {}) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  // When index.html already painted this heading, keep it still instead of fading it in again.
  const [painted] = useState(() => landing && document.documentElement.dataset.prerender === '1')
  useEffect(() => { delete document.documentElement.dataset.prerender }, [])
  const memory = readRegionMemory()
  usePageMeta(
    "Choose a city · Gusto's Guide",
    'Seattle covers the city plus Bellevue, Kirkland, and Redmond. San Francisco covers the city, the East Bay, the Peninsula, and the North Bay. Los Angeles is its own list. San Diego is its own list and also includes La Jolla, Coronado, Chula Vista, and North County. Vancouver, Portland, and New York are their own lists. Pullman, WA includes Moscow, ID.',
  )

  function open(region: RegionId) {
    const regionAreas = REGIONS.find((item) => item.id === region)?.areas ?? ['seattle']
    const area = memory.region === region && regionAreas.includes(memory.area) ? memory.area : regionAreas[0]
    writeRegionMemory(area)
    navigate(cityPath('/', area))
  }

  return (
    <main id="main" tabIndex={-1} className={`mx-auto max-w-3xl px-4 pt-28 pb-16 outline-none${landing ? ' city-landing' : ''}`}>
      <m.div
        initial={reduce || painted ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? { duration: 0 } : SPRING}
      >
      <p className="area-kicker">Gusto's Guide</p>
      <h1 className="mt-2 font-serif text-6xl italic">{landing ? 'Where are you eating?' : 'Choose a city'}</h1>
      <p className="mt-3 max-w-xl">{landing ? 'Pick a city to open its guide.' : 'Pick a city to explore.'}</p>
      </m.div>
      <div className="mt-6 grid gap-3">
        {REGIONS.map((region, index) => {
          const on = memory.region === region.id
          return (
            <m.button
              key={region.id}
              type="button"
              className="city-card"
              aria-current={on ? 'true' : undefined}
              onClick={() => open(region.id)}
              initial={reduce || painted ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { ...SPRING, delay: (landing ? 0.12 : 0) + index * 0.06 }}
            >
              <span className="min-w-0 text-left">
                <span className="city-card-title">
                  <span className="font-serif text-4xl italic leading-none">{region.name}</span>
                  {on ? <span className="city-card-tag">Last opened</span> : null}
                </span>
                <span className="mt-2 block text-sm">{region.detail}</span>
              </span>
              <svg className="city-card-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </m.button>
          )
        })}
      </div>
    </main>
  )
}
