import { priceLabel } from '../lib/format.ts'
import { PRICE_TIERS, type PriceChoice } from '../lib/price-filter.ts'
import type { Price } from '../types.ts'

export function PriceFilter({
  choice,
  showUnknown,
  onChange,
}: {
  choice: PriceChoice
  showUnknown: boolean
  onChange: (next: PriceChoice) => void
}) {
  function toggle(price: Price) {
    const prices = choice.prices.includes(price)
      ? choice.prices.filter((item) => item !== price)
      : [...choice.prices, price]
    onChange({ prices, unknown: choice.unknown })
  }

  return (
    <div className="price-filter" role="group" aria-label="Price">
      {PRICE_TIERS.map((price) => (
        <button
          key={price}
          type="button"
          className="chip"
          aria-pressed={choice.prices.includes(price)}
          onClick={() => toggle(price)}
        >
          {priceLabel(price)}
        </button>
      ))}
      {showUnknown ? (
        <button
          type="button"
          className="chip"
          aria-pressed={choice.unknown}
          onClick={() => onChange({ prices: choice.prices, unknown: !choice.unknown })}
        >
          No price
        </button>
      ) : null}
    </div>
  )
}
