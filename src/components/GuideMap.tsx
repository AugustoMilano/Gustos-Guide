import { useEffect, useRef } from 'react'
import { MapContainer, useMap, ZoomControl } from 'react-leaflet'
import { divIcon, latLngBounds, marker, type Layer, type MarkerClusterGroup } from 'leaflet'
import '../lib/setup-leaflet.ts'
import 'leaflet.markercluster'
import { escapeHtml } from '../lib/format.ts'
import type { VisitStatus } from '../types.ts'

type MapPlace = { id: string; name: string; neighborhood: string; lat: number; lng: number }

const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

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
      layer = maplibreGL({ style: BASEMAP_STYLE }).addTo(map)
      map.invalidateSize()
    })()

    return () => {
      cancelled = true
      if (!layer) return
      map.removeLayer(layer)
    }
  }, [map])

  return null
}

const COLORS: Record<VisitStatus | 'none', string> = {
  togo: '#FF5330',
  been: '#38BA46',
  none: '#141F4D',
}

function pinIcon(color: string) {
  return divIcon({
    className: 'gusto-pin-wrap',
    html: `<span class="gusto-pin" style="background:${color}"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function FitPins({
  places,
  statuses,
}: {
  places: MapPlace[]
  statuses: Record<string, VisitStatus>
}) {
  const map = useMap()
  const seenIds = useRef('')
  const idKey = places.map((place) => place.id).join('|')
  const colorKey = places.map((place) => statuses[place.id] ?? 'none').join('|')

  useEffect(() => {
    const group: MarkerClusterGroup = window.L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 46,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster) =>
        divIcon({
          className: 'gusto-cluster',
          html: `<span>${cluster.getChildCount()}</span>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
    })

    for (const place of places) {
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue
      const status = statuses[place.id] ?? 'none'
      const pin = marker([place.lat, place.lng], {
        icon: pinIcon(COLORS[status]),
        title: place.name,
        keyboard: true,
        alt: place.name,
      })
      const href = `#/place/${place.id}`
      pin.bindPopup(
        `<strong>${escapeHtml(place.name)}</strong><br/><span>${escapeHtml(place.neighborhood)}</span><br/><a href="${href}">Open ${escapeHtml(place.name)}</a>`,
      )
      group.addLayer(pin)
    }

    map.addLayer(group)
    let cancelled = false
    const fit = () => {
      if (cancelled) return
      map.invalidateSize()
      if (map.getSize().y < 40) return
      if (seenIds.current === idKey) return
      seenIds.current = idKey
      if (places.length === 1) {
        map.setView([places[0].lat, places[0].lng], 15)
      } else if (places.length > 1) {
        map.fitBounds(latLngBounds(places.map((place) => [place.lat, place.lng])), {
          padding: [42, 42],
          maxZoom: 15,
        })
      }
    }
    const frame = window.requestAnimationFrame(fit)
    const timer = window.setTimeout(fit, 250)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
      map.removeLayer(group)
    }
    // Refit when the place set changes. Color changes rebuild pins without a new dependency split
    // because both keys are listed; fitBounds on a color change stays at street-or-city zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, idKey, colorKey])

  return null
}

export function GuideMap({
  places,
  statuses,
}: {
  places: MapPlace[]
  statuses: Record<string, VisitStatus>
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
        minZoom={1}
        maxZoom={18}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
      >
        <ZoomControl position="topright" />
        <Basemap />
        <FitPins places={places} statuses={statuses} />
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
