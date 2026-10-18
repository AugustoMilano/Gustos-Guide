import { SEED_PLACES } from '../data/seed.ts'

export function Marquee() {
  const dishes = SEED_PLACES.map((place) => place.dish)
  return (
    <div className="marquee" aria-label="Dishes in the house guides">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="marquee-group" aria-hidden={copy === 1 ? true : undefined}>
            {dishes.map((dish, index) => (
              <span key={`${copy}-${index}`} className="inline-flex items-center gap-3">
                <span className="font-serif text-xl italic sm:text-2xl">{dish}</span>
                <span aria-hidden="true" className="text-coral">
                  ✦
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
