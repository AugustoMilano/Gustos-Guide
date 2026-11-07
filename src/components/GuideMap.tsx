import { useEffect, useRef, useState } from 'react'
import { MapContainer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { circleMarker, divIcon, latLngBounds, marker, type Layer, type CircleMarker, type MarkerClusterGroup } from 'leaflet'
import { readPosition } from '../lib/geo.ts'
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
const LOS_ANGELES = latLngBounds(
  [33.7, -118.72],
  [34.34, -118.1],
)
const SAN_FRANCISCO = latLngBounds(
  [37.7, -122.52],
  [37.83, -122.35],
)
const EAST_BAY = latLngBounds(
  [37.5, -122.35],
  [37.95, -121.8],
)
const PENINSULA = latLngBounds(
  [37.15, -122.55],
  [37.7, -121.75],
)
const NORTH_BAY = latLngBounds(
  [37.82, -122.58],
  [38.0, -122.42],
)

function fallbackBounds(places: MapPlace[]) {
  const place = places.find((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
  if (place && place.lat < 36) return LOS_ANGELES
  if (place && place.lat < 42) {
    if (place.lat >= 37.84 && place.lng <= -122.4) return NORTH_BAY
    if (place.lng > -122.35 && place.lat > 37.55) return EAST_BAY
    if (place.lat < 37.7 || place.lng > -122.25) return PENINSULA
    return SAN_FRANCISCO
  }
  return SEATTLE
}

export type MapBounds = { south: number; north: number; west: number; east: number }
export type MapCamera = { lat: number; lng: number; zoom: number }

const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

function ZoomButtons() {
  const map = useMap()
  const here = useRef<CircleMarker | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => () => {
    here.current?.remove()
  }, [])

  async function locate() {
    setNote('')
    try {
      const position = await readPosition()
      const at: [number, number] = [position.lat, position.lng]
      if (!here.current) {
        here.current = circleMarker(at, {
          radius: 8,
          color: '#141f4d',
          weight: 3,
          fillColor: '#ff5330',
          fillOpacity: 1,
        }).addTo(map)
      } else {
        here.current.setLatLng(at)
      }
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) map.setView(at, 15, { animate: false })
      else map.flyTo(at, 15, { duration: 0.7 })
    } catch (reason) {
      setNote(reason instanceof Error ? reason.message : 'Location unavailable.')
    }
  }

  return (
    <>
      <div className="leaflet-top leaflet-right">
        <div className="leaflet-control map-zoom">
          <button type="button" aria-label="Zoom in" onClick={() => map.zoomIn()}>+</button>
          <button type="button" aria-label="Zoom out" onClick={() => map.zoomOut()}>−</button>
          <button type="button" aria-label="Show my location" onClick={() => void locate()}>
            <span aria-hidden="true">⌖</span>
          </button>
        </div>
      </div>
      {note ? <p className="map-locate-note" role="status">{note}</p> : null}
    </>
  )
}

function whenIdle(work: () => void): number {
  if (typeof window.requestIdleCallback === 'function') return window.requestIdleCallback(work, { timeout: 700 })
  return window.setTimeout(work, 1)
}

function cancelIdle(id: number) {
  if (typeof window.cancelIdleCallback === 'function' && typeof window.requestIdleCallback === 'function') {
    window.cancelIdleCallback(id)
    return
  }
  window.clearTimeout(id)
}

function Basemap() {
  const map = useMap()

  useEffect(() => {
    let layer: Layer | null = null
    let cancelled = false
    let idleId = 0

    const start = () => {
      void (async () => {
      try {
      await import('../lib/setup-maplibre.ts')
      await import('maplibre-gl/dist/maplibre-gl.css')
      const { maplibreGL } = await import('@maplibre/maplibre-gl-leaflet')
      if (cancelled) return
      const created = maplibreGL({ style: BASEMAP_STYLE, preserveDrawingBuffer: true } as object)
      // The bridge reads the Leaflet zoom inside a frame callback with no map check.
      // Opening a place mid-zoom used to throw after the map was already gone.
      const bridge = created as unknown as {
        _map: {
          getZoom: () => number
          getCenter: () => { lng: number; lat: number }
          getBounds: () => { getNorthWest: () => { lat: number; lng: number } }
          latLngToContainerPoint: (latlng: { lat: number; lng: number }) => unknown
        } | null
        _glMap: {
          _actualCanvas: HTMLElement
          once: (event: string, fn: () => void) => void
          jumpTo: (options: { center: { lng: number; lat: number }; zoom: number }) => void
        } | null
        _resizeContainer: () => void
        _zoomEnd: () => void
        _transitionEnd: () => void
      }
      const zoomEnd = bridge._zoomEnd
      bridge._zoomEnd = function () {
        if (!bridge._map) return
        zoomEnd.call(bridge)
      }
      bridge._transitionEnd = function () {
        window.L.Util.requestAnimFrame(() => {
          const live = bridge._map
          const gl = bridge._glMap
          if (!live || !gl?._actualCanvas) return
          const zoom = live.getZoom()
          const center = live.getCenter()
          const offset = live.latLngToContainerPoint(live.getBounds().getNorthWest())
          bridge._resizeContainer()
          window.L.DomUtil.setTransform(gl._actualCanvas, offset as Parameters<typeof window.L.DomUtil.setTransform>[1], 1)
          gl.once('moveend', () => {
            if (bridge._map) bridge._zoomEnd()
          })
          gl.jumpTo({ center, zoom: zoom - 1 })
        })
      }
      created.addTo(map)
      layer = created
      const gl = (created as { getMaplibreMap?: () => { resize: () => void; once: (event: string, fn: () => void) => void } }).getMaplibreMap?.()
      const nudge = () => {
        try {
          map.invalidateSize()
          gl?.resize()
        } catch {
          // The map can already be gone when a tile load finishes.
        }
      }
      gl?.once('load', nudge)
      gl?.once('idle', nudge)
      nudge()
      } catch {
        // A basemap failure leaves the list up.
      }
      })()
    }

    idleId = whenIdle(start)

    const observer = new ResizeObserver(() => {
      try {
        map.invalidateSize()
        const gl = (layer as { getMaplibreMap?: () => { resize: () => void } } | null)?.getMaplibreMap?.()
        gl?.resize()
      } catch {
        // The map can already be gone when the sheet resizes.
      }
    })
    observer.observe(map.getContainer())

    return () => {
      cancelled = true
      cancelIdle(idleId)
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
    html: `<span class="gusto-pin${hot ? ' is-hot' : ''}" style="color:${color}"><svg viewBox="0 0 32 42" aria-hidden="true"><path fill="currentColor" d="M16 1.6C8.6 1.6 2.6 7.5 2.6 14.8 2.6 24.4 16 40.4 16 40.4S29.4 24.4 29.4 14.8C29.4 7.5 23.4 1.6 16 1.6z"/><circle cx="16" cy="14.8" r="5" fill="#eee3d6"/></svg></span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 42],
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
  onSelect,
  camera,
  hold,
}: {
  places: MapPlace[]
  statuses: Record<string, VisitStatus>
  activeId?: string | null
  onHover?: (id: string | null) => void
  onSelect?: (id: string) => void
  camera?: MapCamera | null
  hold?: boolean
}) {
  const map = useMap()
  const seenIds = useRef('')
  const markers = useRef(new Map<string, ReturnType<typeof marker>>())
  const groupRef = useRef<MarkerClusterGroup | null>(null)
  const hoverRef = useRef(onHover)
  const selectRef = useRef(onSelect)
  const focusRef = useRef<string | null>(null)
  hoverRef.current = onHover
  selectRef.current = onSelect
  const cameraRef = useRef(camera ?? null)
  const holdRef = useRef(Boolean(hold))
  holdRef.current = Boolean(hold)
  const idKey = places.map((place) => place.id).join('|')
  const colorKey = places.map((place) => statuses[place.id] ?? 'none').join('|')

  useEffect(() => {
    const group: MarkerClusterGroup = window.L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 80,
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
    groupRef.current = group
    map.addLayer(group)
    let cancelled = false
    const finite = places.filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng))
    let cursor = 0
    let pump = 0
    const addBatch = () => {
      if (cancelled) return
      const end = Math.min(cursor + 50, finite.length)
      for (; cursor < end; cursor += 1) {
        const place = finite[cursor]
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
        pin.on('click', () => {
          focusRef.current = place.id
          hoverRef.current?.(place.id)
          selectRef.current?.(place.id)
        })
        markers.current.set(place.id, pin)
        group.addLayer(pin)
      }
      if (cursor < finite.length) pump = window.requestAnimationFrame(addBatch)
    }
    pump = window.requestAnimationFrame(addBatch)
    const fit = () => {
      if (cancelled) return
      try {
        map.invalidateSize()
        const size = map.getSize()
        if (size.y < 200 || size.x < 200) return
        const key = `${idKey}:${size.x}x${size.y}`
        if (seenIds.current === key) return
        if (holdRef.current) {
          seenIds.current = key
          return
        }
        const saved = cameraRef.current
        if (saved) {
          cameraRef.current = null
          seenIds.current = key
          map.setView([saved.lat, saved.lng], saved.zoom, { animate: false })
          return
        }
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
          map.fitBounds(fallbackBounds(places), { padding: [28, 28], maxZoom: 12, animate: false })
        }
      } catch {
        // Leaflet throws from getZoom when the map is removed mid-fit.
      }
    }
    map.on('resize', fit)
    const frame = window.requestAnimationFrame(fit)
    const timer = window.setTimeout(fit, 400)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      window.cancelAnimationFrame(pump)
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
    if (!pin) return () => element?.classList.remove('is-hot')
    const latlng = pin.getLatLng()
    const focused = focusRef.current === activeId
    if (focused) focusRef.current = null
    try {
      const inView = map.getBounds().pad(-0.08).contains(latlng)
      if (!focused && inView) return () => element?.classList.remove('is-hot')
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const zoom = focused ? Math.max(map.getZoom(), 15) : map.getZoom()
      if (reduce) map.setView(latlng, zoom, { animate: false })
      else map.flyTo(latlng, zoom, { duration: focused ? 0.75 : 0.45 })
    } catch {
      // The map can unmount while a pin is still active.
    }
    return () => element?.classList.remove('is-hot')
  }, [activeId, map, statuses])

  return null
}

function FocusSpot({ spot }: { spot?: MapCamera | null }) {
  const map = useMap()
  const seen = useRef('')

  useEffect(() => {
    if (!spot) return
    const key = `${spot.lat.toFixed(4)},${spot.lng.toFixed(4)}`
    if (seen.current === key) return
    seen.current = key
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    try {
      if (reduce) map.setView([spot.lat, spot.lng], 14, { animate: false })
      else map.flyTo([spot.lat, spot.lng], 14, { duration: 0.7 })
    } catch {
      // The map can unmount while the camera is moving.
    }
  }, [spot, map])

  return null
}

function WatchBounds({ onMoveEnd, onCamera }: { onMoveEnd?: (box: MapBounds) => void; onCamera?: (camera: MapCamera) => void }) {
  const map = useMap()
  const callback = useRef(onMoveEnd)
  const cameraCallback = useRef(onCamera)

  useEffect(() => {
    callback.current = onMoveEnd
    cameraCallback.current = onCamera
  })

  useEffect(() => {
    const report = () => {
      try {
        const bounds = map.getBounds()
        callback.current?.({
          south: bounds.getSouth(),
          north: bounds.getNorth(),
          west: bounds.getWest(),
          east: bounds.getEast(),
        })
        const center = map.getCenter()
        cameraCallback.current?.({ lat: center.lat, lng: center.lng, zoom: map.getZoom() })
      } catch {
        // The map can already be gone when the route changes.
      }
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
  onCamera,
  activeId,
  onHover,
  onSelect,
  camera,
  focus,
}: {
  places: MapPlace[]
  statuses: Record<string, VisitStatus>
  onMoveEnd?: (box: MapBounds) => void
  onCamera?: (camera: MapCamera) => void
  activeId?: string | null
  onHover?: (id: string | null) => void
  onSelect?: (id: string) => void
  camera?: MapCamera | null
  focus?: MapCamera | null
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
        Map of {places.length === 1 ? '1 place' : `${places.length} places`}. Pins cluster when zoomed out. Coral means to go, green means been, navy means
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
        <FitPins places={places} statuses={statuses} activeId={activeId} onHover={onHover} onSelect={onSelect} camera={camera} hold={Boolean(focus)} />
        <FocusSpot spot={focus} />
        <WatchBounds onMoveEnd={onMoveEnd} onCamera={onCamera} />
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
