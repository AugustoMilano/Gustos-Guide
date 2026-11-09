import { placeNameClass } from '../lib/place-name.ts'
import { cuisineLabel } from '../lib/cuisine-label.ts'
import { priceLabel } from '../lib/format.ts'
import type { Price } from '../types.ts'

export function PlaceName({ name, className = '' }: { name: string; className?: string }) {
  return <span className={placeNameClass(name, className)}>{name}</span>
}

/** Cuisine, price, and neighborhood. Wraps at the dots, never inside a word. */
export function PlaceMeta({ parts, className = '' }: { parts: Array<string | null | undefined | false>; className?: string }) {
  const items = parts.filter((part): part is string => Boolean(part))
  if (!items.length) return null
  return (
    <span className={`place-meta${className ? ` ${className}` : ''}`}>
      {items.map((item, index) => (
        <span key={`${item}-${index}`}>{item}</span>
      ))}
    </span>
  )
}

export function placeCardMeta(place: { cuisine?: string[]; price?: number; neighborhood?: string; closed?: boolean }): string[] {
  const cuisine = place.cuisine?.[0] ? cuisineLabel(place.cuisine[0]) : ''
  return [cuisine, priceLabel(place.price as Price | undefined), place.neighborhood ?? '', place.closed ? 'Closed' : ''].filter(Boolean)
}
