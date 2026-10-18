import { useState } from 'react'
import type { PlaceFilters, SortKey, StatusPill } from '../lib/filters.ts'
import { activeFilterCount } from '../lib/filters.ts'
import { priceLabel } from '../lib/format.ts'
import type { Place, Price } from '../types.ts'

const PILLS: { id: StatusPill; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'togo', label: 'To go' },
  { id: 'been', label: 'Been' },
]

export function FilterBar({
  places,
  filters,
  onFilters,
  sort,
  onSort,
  pill,
  onPill,
  counts,
  onNearMe,
  locating,
  locationError,
  hasOrigin,
  allowOrder,
}: {
  places: Place[]
  filters: PlaceFilters
  onFilters: (filters: PlaceFilters) => void
  sort: SortKey
  onSort: (sort: SortKey) => void
  pill: StatusPill
  onPill: (pill: StatusPill) => void
  counts: Record<StatusPill, number>
  onNearMe: () => void
  locating: boolean
  locationError: string
  hasOrigin: boolean
  allowOrder: boolean
}) {
  const [open, setOpen] = useState(false)
  const cuisines = Array.from(new Set(places.map((place) => place.cuisine))).sort()
  const neighborhoods = Array.from(new Set(places.map((place) => place.neighborhood))).sort()
  const count = activeFilterCount(filters)

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
  }

  function togglePrice(value: Price) {
    const prices = filters.prices.includes(value)
      ? filters.prices.filter((item) => item !== value)
      : [...filters.prices, value]
    onFilters({ ...filters, prices })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap">
          {PILLS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={pill === item.id}
              className={`btn text-sm ${index > 0 ? 'border-l-0' : ''} ${pill === item.id ? 'btn-navy' : ''}`}
              onClick={() => onPill(item.id)}
            >
              {item.label} {counts[item.id]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn text-sm"
          aria-expanded={open}
          aria-controls="guide-filters"
          onClick={() => setOpen((value) => !value)}
        >
          Filter{count ? ` · ${count}` : ''}
        </button>
        <label className="flex items-center gap-2 text-sm font-bold">
          <span className="sr-only">Sort</span>
          <select
            aria-label="Sort places"
            value={sort}
            onChange={(event) => onSort(event.target.value as SortKey)}
            className="min-h-11 border-2 border-ink bg-cream px-2"
          >
            {allowOrder ? <option value="order">List order</option> : null}
            <option value="rating">Rating</option>
            <option value="name">Name</option>
            <option value="distance">Distance</option>
          </select>
        </label>
        <button type="button" className="btn btn-coral text-sm" onClick={onNearMe} disabled={locating}>
          {locating ? 'Locating…' : 'Near me'}
        </button>
        {hasOrigin ? <span className="text-sm font-semibold text-muted">Using your location</span> : null}
      </div>
      {locationError ? (
        <p className="text-sm font-semibold" role="status">
          {locationError}
        </p>
      ) : null}
      <div id="guide-filters" hidden={!open} className="card p-4 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-2xl">Filter</h2>
          <button type="button" className="btn text-sm" onClick={() => onFilters({ cuisines: [], neighborhoods: [], prices: [] })}>
            Clear
          </button>
        </div>
        <fieldset className="mt-3">
          <legend className="text-xs font-bold tracking-[0.08em] uppercase">Cuisine</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {cuisines.map((cuisine) => (
              <button
                key={cuisine}
                type="button"
                className="chip"
                aria-pressed={filters.cuisines.includes(cuisine)}
                onClick={() => onFilters({ ...filters, cuisines: toggle(filters.cuisines, cuisine) })}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-3">
          <legend className="text-xs font-bold tracking-[0.08em] uppercase">Neighborhood</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {neighborhoods.map((neighborhood) => (
              <button
                key={neighborhood}
                type="button"
                className="chip"
                aria-pressed={filters.neighborhoods.includes(neighborhood)}
                onClick={() =>
                  onFilters({ ...filters, neighborhoods: toggle(filters.neighborhoods, neighborhood) })
                }
              >
                {neighborhood}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-3">
          <legend className="text-xs font-bold tracking-[0.08em] uppercase">Price</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([1, 2, 3, 4] as Price[]).map((price) => (
              <button
                key={price}
                type="button"
                className="chip"
                aria-pressed={filters.prices.includes(price)}
                onClick={() => togglePrice(price)}
              >
                {priceLabel(price)}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  )
}
