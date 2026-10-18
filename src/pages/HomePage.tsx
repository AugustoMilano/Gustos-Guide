import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Marquee } from '../components/Marquee.tsx'
import { ParticleHero } from '../components/ParticleHero.tsx'
import { PlaceArt } from '../components/PlaceArt.tsx'
import { Reveal } from '../components/Reveal.tsx'
import { spotLabel } from '../lib/format.ts'
import { ratingRanks } from '../lib/filters.ts'
import { useGuide } from '../state/GuideContext.tsx'

export function HomePage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { cities, guides, places, placeById, user, requestSignIn, openSheet } = useGuide()
  const progressRef = useRef(0)
  const heroRef = useRef<HTMLElement>(null)
  const city = cities.find((item) => item.slug === (slug ?? 'seattle')) ?? cities[0]
  const house = guides.filter((guide) => guide.kind === 'house' && guide.cityId === city?.id)
  const mine = guides.filter((guide) => guide.kind === 'user' && guide.cityId === city?.id)
  const ranked = ratingRanks(places.filter((place) => place.cityId === city?.id && place.source === 'house'))
  const highlights = places
    .filter((place) => place.cityId === city?.id && place.source === 'house')
    .slice()
    .sort((a, b) => (ranked.get(a.id) ?? 99) - (ranked.get(b.id) ?? 99))
    .slice(0, 4)

  useEffect(() => {
    document.title = city ? `${city.name} · Gusto's Guide` : "Gusto's Guide"
  }, [city])

  useEffect(() => {
    const onScroll = () => {
      const height = heroRef.current?.offsetHeight || 1
      progressRef.current = Math.min(1, Math.max(0, window.scrollY / height))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!city) return null

  return (
    <>
      <section ref={heroRef} className="hero on-navy px-4 pt-20 pb-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="sr-only">Gusto's Guide</h1>
          <ParticleHero progressRef={progressRef} />
          <div className="relative z-1 -mt-2 flex flex-wrap items-end justify-between gap-4">
            <p className="max-w-xl font-serif text-2xl italic leading-snug text-cream sm:text-3xl">
              A field guide to the sandwiches, pies, and plates worth crossing town for.
            </p>
            <button
              type="button"
              className="btn btn-coral"
              onClick={() => document.getElementById('guides')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Browse the guides
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="sticker -rotate-3">Worth the bus</span>
            <span className="sticker navy rotate-2">Seattle first</span>
            <span className="sticker cream hero-sticker-late rotate-6">For Augusto</span>
          </div>
        </div>
      </section>
      <Marquee />
      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-8 outline-none">
        <CityTabs active={city.slug} />
        <p className="mt-4 max-w-2xl text-lg text-muted">{city.blurb}</p>

        {city.comingSoon && house.length === 0 ? (
          <LosAngelesEmpty
            signedIn={Boolean(user)}
            onStart={() => {
              if (!user) requestSignIn({ type: 'create-guide', cityId: city.id })
              else openSheet({ type: 'create-guide', cityId: city.id })
            }}
          />
        ) : (
          <section id="guides" className="mt-8" aria-labelledby="guides-heading">
            <Reveal>
              <h2 id="guides-heading" className="font-serif text-5xl italic sm:text-7xl">
                The guides
              </h2>
            </Reveal>
            {house.length === 0 ? (
              <p className="mt-4 max-w-lg">No house guides here yet. Start a private list and it stays on this device.</p>
            ) : (
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {house.map((guide, index) => {
                  const cover = placeById(guide.placeIds[0] ?? '')
                  const count = guide.placeIds.filter((id) => placeById(id)).length
                  return (
                    <Reveal key={guide.id} delay={index * 0.08}>
                      <Link to={`/guide/${guide.slug}`} className="card relative block overflow-hidden">
                        {cover ? <PlaceArt place={cover} /> : null}
                        <span className="sticker absolute top-4 right-4 rotate-3">{spotLabel(count)}</span>
                        <div className="p-5">
                          <p className="meta-line">House guide · {city.name}</p>
                          <h3 className="mt-1 font-serif text-4xl leading-none sm:text-5xl">{guide.title}</h3>
                          <p className="note mt-3">{guide.dek}</p>
                        </div>
                      </Link>
                    </Reveal>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {highlights.length > 0 && !city.comingSoon ? (
          <section className="mt-12" aria-labelledby="spots-heading">
            <h2 id="spots-heading" className="font-serif text-4xl italic">
              Highest on the list
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {highlights.map((place, index) => (
                <Link
                  key={place.id}
                  to={`/place/${place.slug}`}
                  className="card relative block overflow-hidden"
                  style={{ transform: `rotate(${index % 2 === 0 ? -1.5 : 1.5}deg)` }}
                >
                  <PlaceArt place={place} />
                  <span className="absolute bottom-3 left-3 sticker">{place.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12" aria-labelledby="mine-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="mine-heading" className="font-serif text-4xl italic">
              My guides
            </h2>
            <button
              type="button"
              className="btn btn-navy"
              onClick={() => {
                if (!user) requestSignIn({ type: 'create-guide', cityId: city.id })
                else openSheet({ type: 'create-guide', cityId: city.id })
              }}
            >
              New guide
            </button>
          </div>
          {user && mine.length > 0 ? (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {mine.map((guide) => (
                <li key={guide.id}>
                  <Link to={`/my/${guide.id}`} className="card block p-4">
                    <p className="meta-line">Your list · {spotLabel(guide.placeIds.length)}</p>
                    <h3 className="font-serif text-3xl">{guide.title}</h3>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 max-w-xl">
              {user
                ? `Nothing in ${city.name} with your name on it yet.`
                : 'Sign in with your name to keep lists, mark been, and reorder them. It stays on this device.'}
            </p>
          )}
          <button type="button" className="btn mt-4 sm:hidden" onClick={() => navigate('/my')}>
            Open My guides
          </button>
        </section>
      </main>
    </>
  )
}

function CityTabs({ active }: { active: string }) {
  const { cities, user, requestSignIn, openSheet } = useGuide()
  return (
    <nav aria-label="Cities" className="flex flex-wrap gap-2">
      {cities.map((city) => {
        const current = city.slug === active
        return (
          <Link
            key={city.id}
            to={city.slug === 'seattle' ? '/' : `/city/${city.slug}`}
            aria-current={current ? 'page' : undefined}
            className={`btn text-sm ${current ? 'btn-navy' : ''}`}
          >
            {city.name}
          </Link>
        )
      })}
      <button
        type="button"
        className="btn border-dashed text-sm"
        onClick={() => {
          if (!user) requestSignIn({ type: 'add-city' })
          else openSheet({ type: 'add-city' })
        }}
      >
        Add city
      </button>
    </nav>
  )
}

function LosAngelesEmpty({ signedIn, onStart }: { signedIn: boolean; onStart: () => void }) {
  return (
    <section id="guides" className="relative mt-8 overflow-hidden border-2 border-ink bg-[#fff6ea] p-6 sm:p-10">
      <div className="flex flex-wrap gap-3">
        <span className="sticker -rotate-6">Coming soon</span>
        <span className="sticker navy rotate-3">Hold the tacos</span>
        <span className="sticker leaf -rotate-2">The list is blank on purpose</span>
      </div>
      <h2 className="mt-6 max-w-xl font-serif text-5xl italic leading-none sm:text-7xl">
        Los Angeles is on the list. The guides are not.
      </h2>
      <p className="mt-4 max-w-lg text-lg">
        House rankings stop at the King County line for now. If you have already eaten your way down the 5, start a
        private list. It lives in this browser.
      </p>
      <button type="button" className="btn btn-coral mt-6" onClick={onStart}>
        {signedIn ? 'Start a Los Angeles list' : 'Sign in to start a list'}
      </button>
    </section>
  )
}
