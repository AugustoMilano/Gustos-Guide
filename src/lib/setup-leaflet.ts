import * as Leaflet from 'leaflet'

/**
 * leaflet.markercluster's build expects a mutable global `L`.
 * Leaflet's ESM namespace can't be extended, so copy the exports onto
 * a plain object before the plugin script runs.
 */
const bag: typeof Leaflet = Object.assign({}, Leaflet)
window.L = bag

type PaneMap = Leaflet.Map & { _mapPane?: HTMLElement; _getMapPanePos?: () => Leaflet.Point }
const mapProto = Leaflet.Map.prototype as PaneMap
const readPane = mapProto._getMapPanePos
if (readPane) {
  mapProto._getMapPanePos = function (this: PaneMap) {
    if (!this._mapPane) return new Leaflet.Point(0, 0)
    try {
      return readPane.call(this)
    } catch {
      return new Leaflet.Point(0, 0)
    }
  }
}
