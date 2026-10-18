import * as Leaflet from 'leaflet'

/**
 * leaflet.markercluster's build expects a mutable global `L`.
 * Leaflet's ESM namespace can't be extended, so copy the exports onto
 * a plain object before the plugin script runs.
 */
const bag: typeof Leaflet = Object.assign({}, Leaflet)
window.L = bag
