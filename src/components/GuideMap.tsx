import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { divIcon, latLngBounds, marker, type MarkerClusterGroup } from 'leaflet'
import '../lib/setup-leaflet.ts'
import 'leaflet.markercluster'
import { escapeHtml } from '../lib/format.ts'
import type { Place, VisitStatus } from '../types.ts'

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
  places: Place[]
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
      const href = `#/place/${place.slug}`
      pin.bindPopup(
        `<strong>${escapeHtml(place.name)}</strong><br/><span>${escapeHtml(place.neighborhood)}</span><br/><a href="${href}">Open ${escapeHtml(place.name)}</a>`,
      )
      group.addLayer(pin)
    }

    map.addLayer(group)
    const shouldFit = seenIds.current !== idKey
    let cancelled = false
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return
      map.invalidateSize()
      if (!shouldFit) return
      seenIds.current = idKey
      if (places.length === 1) {
        map.setView([places[0].lat, places[0].lng], 15)
      } else if (places.length > 1) {
        map.fitBounds(latLngBounds(places.map((place) => [place.lat, place.lng])), {
          padding: [42, 42],
          maxZoom: 15,
        })
      }
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
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
  places: Place[]
  statuses: Record<string, VisitStatus>
}) {
  if (!places.length) {
    return (
      <div className="map-frame grid h-full min-h-72 place-items-center p-6 text-center">
        <p className="font-serif text-2xl italic">No pins in this view.</p>
      </div>
    )
  }

  const first = places[0]
  return (
    <div className="map-frame h-full min-h-72">
      <p className="sr-only">
        Map of {places.length} places. Pins cluster when zoomed out. Coral means to go, green means been, navy means
        unmarked.
      </p>
      <MapContainer
        center={[first.lat, first.lng]}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
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
