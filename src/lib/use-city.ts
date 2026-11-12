import { useEffect, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { catalog, catalogPhase, cityLoaded, ensureCity, subscribeCatalog } from '../content/load.ts'
import { asCityId, cityFromPath, type CityId } from './city.ts'
import type { GuideSummary, SlimPlace } from '../types.ts'

export function useCityId(): CityId {
  const { pathname } = useLocation()
  return cityFromPath(pathname)
}

export function placeCity(place: { city?: string }): CityId {
  return asCityId(place.city)
}

export function isListed(place: { closed?: boolean }): boolean {
  return place.closed !== true
}

export function placesForCity(city: CityId): SlimPlace[] {
  return catalog.places.filter((place) => isListed(place) && placeCity(place) === city)
}

export function guidesForCity(city: CityId): GuideSummary[] {
  return catalog.guides.filter((guide) => (guide.city ?? 'seattle') === city)
}

export function useCityCatalog(): { city: CityId; places: SlimPlace[]; guides: GuideSummary[]; ready: boolean; failed: boolean } {
  const phase = useSyncExternalStore(subscribeCatalog, catalogPhase, catalogPhase)
  const city = useCityId()
  useEffect(() => { void ensureCity(city) }, [city])
  return { city, places: placesForCity(city), guides: guidesForCity(city), ready: phase > 0 && cityLoaded(city), failed: phase < 0 }
}
