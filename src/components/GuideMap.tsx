import { useEffect, useRef } from 'react'
import { MapContainer, useMap } from 'react-leaflet'
import { divIcon, latLngBounds, marker, type Layer, type MarkerClusterGroup } from 'leaflet'
import '../lib/setup-leaflet.ts'
import 'leaflet.markercluster'
import { escapeHtml } from '../lib/format.ts'
import { appleDirectionsUrl, applePlaceUrl, googleDirectionsUrl, googleMapsUrl, prefersAppleMaps } from '../lib/maps.ts'
import type { VisitStatus } from '../types.ts'

type MapPlace = { id: string; name: string; neighborhood: string; lat: number; lng: number; address?: string }

const SEATTLE = latLngBounds(
  [47.495, -122.445],
  [47.745, -122.245],
)

export type MapBounds = { south: number; north: number; west: number; east: number }

const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

function ZoomButtons() {
  const map = useMap()
  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control map-zoom">
        <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()}>−</button>
      </div>
    </div>
  )
}

function Basemap() {
  const map = useMap()

  useEffect(() => {
    let layer: Layer | null = null
    let cancelled = false

    void (async () => {
      await import('../lib/setup-maplibre.ts')
      await import('maplibre-gl/dist/maplibre-gl.css')
      const { maplibreGL } = await import('@maplibre/maplibre-gl-leaflet')
      if (cancelled) return
      const created = maplibreGL({ style: BASEMAP_STYLE, preserveDrawingBuffer: true } as object)
      created.addTo(map)
      layer = created
      const gl = (created as { getMaplibreMap?: () => { resize: () => void; once: (event: string, fn: () => void) => void } }).getMaplibreMap?.()
      const nudge = () => {
        map.invalidateSize()
        gl?.resize()
      }
      gl?.once('load', nudge)
      gl?.once('idle', nudge)
      nudge()
    })()

    const observer = new ResizeObserver(() => {
      map.invalidateSize()
      const gl = (layer as { getMaplibreMap?: () => { resize: () => void } } | null)?.getMaplibreMap?.()
      gl?.resize()
    })
    observer.observe(map.getContainer())

    return () => {
      cancelled = true
      observer.disconnect()
      if (!layer) return
      try {
        map.removeLayer(layer)
      } catch {
        // The map can already be gone when the route changes.
      }
    }
  }, [map])

  return null
}

const COLORS: Record<VisitStatus | 'none', string> = {
  togo: '#FF5330',
  been: '#38BA46',
  none: '#141F4D',
}

function pinIcon(color: string, hot = false) {
  return divIcon({
    className: `gusto-pin-wrap${hot ? ' is-hot' : ''}`,
    html: `<span class="gusto-pin${hot ? ' is-hot' : ''}" style="background:${color}"></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

function popupHtml(place: MapPlace): string {
  const apple = prefersAppleMaps()
  const placeUrl = applePlaceUrl(place.id)
  const links = apple
    ? `${placeUrl ? `<a href="${escapeHtml(placeUrl)}">Open in Apple Maps</a><br/>` : ''}<a href="${escapeHtml(appleDirectionsUrl(place))}">Directions</a>`
    : `<a href="${escapeHtml(googleMapsUrl(place))}">Open in Google Maps</a><br/><a href="${escapeHtml(googleDirectionsUrl(place))}">Directions</a>`
  const href = `#/place/${place.id}`
  return `<strong>${escapeHtml(place.name)}</strong><br/><span>${escapeHtml(place.neighborhood)}</span><br/><a href="${href}">Open ${escapeHtml(place.name)}</a><br/>${links}`
}

function FitPins({
  places,
  statuses,
  activeId,
  onHover,
}: {
  places: MapPlace[]
  statuses: Record<string, VisitStatus>
  activeId?: string | null
  onHover?: (id: string | null) => void
}) {
  const map = useMap()
  const seenIds = useRef('')
  const markers = useRef(new Map<string, ReturnType<typeof marker>>())
  const groupRef = useRef<MarkerClusterGroup | null>(null)
  const hoverRef = useRef(onHover)
  hoverRef.current = onHover
  const idKey = places.map((place) => place.id).join('|')
  const colorKey = places.map((place) => statuses[place.id] ?? 'none').join('|')

  useEffect(() => {
    const group: MarkerClusterGroup = window.L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount()
        return divIcon({
          className: 'gusto-cluster',
          html: `<span class="${count >= 100 ? 'is-wide' : ''}">${count}</span>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        })
      },
    })
    markers.current = new Map()

    for (const place of places) {
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue
      const status = statuses[place.id] ?? 'none'
      const pin = marker([place.lat, place.lng], {
        icon: pinIcon(COLORS[status], place.id === activeId),
        title: place.name,
        keyboard: true,
        alt: place.name,
      })
      pin.bindPopup(popupHtml(place))
      pin.on('mouseover', () => hoverRef.current?.(place.id))
      pin.on('mouseout', () => hoverRef.current?.(null))
      pin.on('focus', () => hoverRef.current?.(place.id))
      markers.current.set(place.id, pin)
      group.addLayer(pin)
    }

    groupRef.current = group
    map.addLayer(group)
    let cancelled = false
    const fit = () => {
      if (cancelled) return
      map.invalidateSize()
      const size = map.getSize()
      if (size.y < 200 || size.x < 200) return
      const key = `${idKey}:${size.x}x${size.y}`
      if (seenIds.current === key) return
      seenIds.current = key
      const finite = places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
      if (finite.length === 1) {
        map.setView([finite[0].lat, finite[0].lng], 15)
      } else if (finite.length > 1) {
        map.fitBounds(latLngBounds(finite.map((place) => [place.lat, place.lng])), {
          padding: [36, 36],
          maxZoom: 14,
          animate: false,
        })
      } else {
        map.fitBounds(SEATTLE, { padding: [28, 28], maxZoom: 12, animate: false })
      }
    }
    map.on('resize', fit)
    const frame = window.requestAnimationFrame(fit)
    const timer = window.setTimeout(fit, 400)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      markers.current.clear()
      groupRef.current = null
      try {
        map.off('resize', fit)
        map.removeLayer(group)
      } catch {
        // The map can already be gone when the route changes.
      }
    }
    // Refit when the place set changes. Color changes rebuild pins without a new dependency split
    // because both keys are listed; fitBounds on a color change stays at street-or-city zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, idKey, colorKey])

  useEffect(() => {
    for (const [id, pin] of markers.current) {
      const status = statuses[id] ?? 'none'
      const hot = id === activeId
      pin.setIcon(pinIcon(COLORS[status], hot))
      pin.setZIndexOffset(hot ? 1000 : 0)
    }
    const pin = activeId ? markers.current.get(activeId) : undefined
    const parent = pin && groupRef.current ? groupRef.current.getVisibleParent(pin) : null
    const element = parent?.getElement?.() ?? pin?.getElement?.() ?? null
    element?.classList.add('is-hot')
    return () => element?.classList.remove('is-hot')
  }, [activeId, statuses])

  return null
}

function WatchBounds({ onMoveEnd }: { onMoveEnd?: (box: MapBounds) => void }) {
  const map = useMap()
  const callback = useRef(onMoveEnd)

  useEffect(() => {
    callback.current = onMoveEnd
  })

  useEffect(() => {
    const report = () => {
      const bounds = map.getBounds()
      callback.current?.({
        south: bounds.getSouth(),
        north: bounds.getNorth(),
        west: bounds.getWest(),
        east: bounds.getEast(),
      })
    }
    map.on('moveend', report)
    return () => {
      try {
        map.off('moveend', report)
      } catch {
        // The map can already be gone when the route changes.
      }
    }
  }, [map])

  return null
}

export function GuideMap({
  places,
  statuses,
  onMoveEnd,
  activeId,
  onHover,
}: {
  places: MapPlace[]
  statuses: Record<string, VisitStatus>
  onMoveEnd?: (box: MapBounds) => void
  activeId?: string | null
  onHover?: (id: string | null) => void
}) {
  if (!places.length) {
    return (
      <div className="map-frame grid h-full min-h-0 place-items-center p-6 text-center">
        <p className="font-serif text-2xl italic">No pins in this view.</p>
      </div>
    )
  }

  const first = places[0]
  return (
    <div className="map-frame h-full min-h-0">
      <p className="sr-only">
        Map of {places.length} places. Pins cluster when zoomed out. Coral means to go, green means been, navy means
        unmarked.
      </p>
      <MapContainer
        center={[first.lat, first.lng]}
        zoom={12}
        zoomSnap={0}
        minZoom={1}
        maxZoom={18}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
      >
        <ZoomButtons />
        <Basemap />
        <FitPins places={places} statuses={statuses} activeId={activeId} onHover={onHover} />
        <WatchBounds onMoveEnd={onMoveEnd} />
      </MapContainer>
      <div className="map-legend">
        <span>
          <i style={{ background: COLORS.togo }} aria-hidden="true" /> To go
        </span>
        <span>
          <i style={{ background: COLORS.been }} aria-hidden="true" /> Been
        </span>
        <span>
          <i style={{ background: COLORS.none }} aria-hidden="true" /> Unmarked
        </span>
      </div>
    </div>
  )
}
