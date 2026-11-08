/** Shared stand-in for a place that has no photograph. The caption is the only announcement. */
export function PlaceArt({ id, cuisine, neighborhood }: { id: string; cuisine: string; neighborhood: string }) {
  void id
  void cuisine
  void neighborhood
  return (
    <span className="place-art no-photo">
      <svg viewBox="0 0 64 48" aria-hidden="true" focusable="false">
        <circle cx="32" cy="26" r="12" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="32" cy="26" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
      <span className="no-photo-caption">Photo coming soon</span>
    </span>
  )
}
