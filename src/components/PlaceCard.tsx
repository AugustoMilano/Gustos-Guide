import { Link, useLocation } from 'react-router-dom'
import { formatMiles, formatRating, priceLabel } from '../lib/format.ts'
import { useGuide } from '../state/GuideContext.tsx'
import type { Place, VisitStatus } from '../types.ts'
import { PlaceMedia } from './PlaceArt.tsx'

export function StatusToggle({ place }: { place: Place }) {
  const { statuses, setStatus } = useGuide()
  const current = statuses[place.id]
  const options: { status: VisitStatus; label: string }[] = [
    { status: 'togo', label: 'To go' },
    { status: 'been', label: 'Been' },
  ]
  return (
    <div className="flex" role="group" aria-label={`Status for ${place.name}`}>
      {options.map((option, index) => {
        const pressed = current === option.status
        return (
          <button
            key={option.status}
            type="button"
            aria-pressed={pressed}
            className={`btn min-h-11 px-3 text-sm ${index === 0 ? '' : 'border-l-0'} ${
              pressed ? (option.status === 'been' ? 'btn-leaf' : 'btn-coral') : ''
            }`}
            onClick={() => setStatus(place.id, option.status)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function PlaceCard({
  place,
  rank,
  distance,
  showCity = false,
  cityName,
  reorder,
}: {
  place: Place
  rank?: number
  distance?: number | null
  showCity?: boolean
  cityName?: string
  reorder?: {
    onUp: () => void
    onDown: () => void
    onRemove: () => void
    disableUp: boolean
    disableDown: boolean
    onDragStart: () => void
    onDrop: () => void
  }
}) {
  const location = useLocation()
  const { openSheet, requestSignIn, user } = useGuide()

  return (
    <article
      className="card flex flex-col"
      draggable={Boolean(reorder)}
      onDragStart={() => reorder?.onDragStart()}
      onDragOver={(event) => {
        if (reorder) event.preventDefault()
      }}
      onDrop={() => reorder?.onDrop()}
    >
      <div className="relative">
        <Link to={`/place/${place.slug}`} state={{ background: location }} tabIndex={-1} className="block">
          <PlaceMedia place={place} decorative />
        </Link>
        {rank ? <span className="rank-badge">{rank}</span> : null}
        <span className="rating-badge">{formatRating(place.rating)}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-serif text-3xl leading-none">
          <Link to={`/place/${place.slug}`} state={{ background: location }} className="hover:text-coral">
            {place.name}
          </Link>
        </h3>
        <p className="meta-line">
          {place.cuisine} <span aria-hidden="true">|</span> {place.neighborhood}
          {showCity && cityName ? ` · ${cityName}` : ''}
        </p>
        <p className="text-sm font-semibold">
          <span aria-label={`Price ${priceLabel(place.price)}`}>{priceLabel(place.price)}</span>
          {place.dish ? <span className="font-normal text-muted"> · Get the {place.dish}</span> : null}
        </p>
        {place.note ? <p className="note">{place.note}</p> : null}
        {typeof distance === 'number' ? <p className="text-sm font-bold">{formatMiles(distance)} away</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
          <StatusToggle place={place} />
          <button
            type="button"
            className="btn text-sm"
            onClick={() => {
              if (!user) requestSignIn({ type: 'save', placeId: place.id })
              else openSheet({ type: 'save', placeId: place.id })
            }}
          >
            Save
          </button>
        </div>
        {reorder ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="btn px-2 text-sm" onClick={reorder.onUp} disabled={reorder.disableUp}>
              Up
            </button>
            <button type="button" className="btn px-2 text-sm" onClick={reorder.onDown} disabled={reorder.disableDown}>
              Down
            </button>
            <button type="button" className="btn px-2 text-sm" onClick={reorder.onRemove}>
              Remove
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
