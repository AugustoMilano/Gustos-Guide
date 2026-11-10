let pending: ReturnType<typeof start> | null = null

function start() {
  return Promise.all([
    import('./setup-maplibre.ts'),
    import('./maplibre-canvas.css'),
    import('@maplibre/maplibre-gl-leaflet'),
  ]).then((mods) => mods[2])
}

/** MapLibre stays out of the first load. The map view, or a hover on Map, starts it. */
export function loadMapLibraries() {
  pending ??= start()
  return pending
}
