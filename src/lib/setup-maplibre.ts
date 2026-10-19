import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// Vite bundles the library away from its worker file. Point MapLibre at the
// emitted worker before any map is constructed.
setWorkerUrl(workerUrl)
