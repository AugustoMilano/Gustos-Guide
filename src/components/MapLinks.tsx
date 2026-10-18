import { useState } from 'react'
import { appleDirectionsUrl, applePlaceUrl, googleMapsUrl, prefersAppleMaps } from '../lib/maps.ts'

type MapPlace = { id: string; name: string; address?: string; lat: number; lng: number }

export function MapLinks({ place }: { place: MapPlace }) {
  const [apple] = useState(() => prefersAppleMaps())
  const placeUrl = applePlaceUrl(place.id)
  if (apple) {
    return (
      <>
        {placeUrl ? (
          <a className="btn text-sm" href={placeUrl}>
            Open in Apple Maps
          </a>
        ) : null}
        <a className="btn text-sm" href={appleDirectionsUrl(place)}>
          Directions
        </a>
      </>
    )
  }
  return (
    <a className="btn text-sm" href={googleMapsUrl(place)}>
      Open in Google Maps
    </a>
  )
}
