/** Shared stand-in for a place that has no photograph. Decorative: the place name sits beside it. */
export function PlaceArt({ id, cuisine, neighborhood }: { id: string; cuisine: string; neighborhood: string }) {
  void id
  void cuisine
  void neighborhood
  return (
    <span className="place-art no-photo" aria-hidden="true">
      <svg viewBox="0 0 64 48" focusable="false">
        <circle cx="32" cy="26" r="12" fill="none" stroke="currentColor" strokeWidth="1.75" />
        <circle cx="32" cy="26" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    </span>
  )
}
