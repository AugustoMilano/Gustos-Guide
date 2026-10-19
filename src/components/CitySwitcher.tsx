import { CITIES } from '../lib/city.ts'

/** Hidden until a second city is marked ready. No new places ship with this. */
export function CitySwitcher() {
  const ready = CITIES.filter((city) => city.ready)
  if (ready.length < 2) return null
  return (
    <label className="field min-w-32">
      <span className="sr-only">City</span>
      <select defaultValue={ready[0]?.id} aria-label="City">
        {ready.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
      </select>
    </label>
  )
}
