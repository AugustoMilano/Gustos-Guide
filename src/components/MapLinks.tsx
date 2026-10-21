import { useState } from 'react'
import { appleDirectionsUrl, applePlaceUrl, googleDirectionsUrl, googleMapsUrl, prefersAppleMaps } from '../lib/maps.ts'

type MapPlace = { id: string; name: string; address?: string; lat: number; lng: number }

export function MapLinks({ place, prominent = false }: { place: MapPlace; prominent?: boolean }) {
  const [apple] = useState(() => prefersAppleMaps())
  const placeUrl = applePlaceUrl(place.id)
  const directions = prominent ? 'btn btn-coral' : 'btn text-sm'
  const maps = 'btn text-sm'
  if (apple) {
    return (
      <>
        <a className={directions} href={appleDirectionsUrl(place)}>
          Directions
        </a>
        {placeUrl ? (
          <a className={maps} href={placeUrl}>
            Open in Apple Maps
          </a>
        ) : null}
      </>
    )
  }
  return (
    <>
      <a className={directions} href={googleDirectionsUrl(place)}>
        Directions
      </a>
      <a className={maps} href={googleMapsUrl(place)}>
        Open in Google Maps
      </a>
    </>
  )
}
