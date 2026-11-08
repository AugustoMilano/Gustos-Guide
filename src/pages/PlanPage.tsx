import { useMemo, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MapLinks } from '../components/MapLinks.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { FriendEmpty } from '../components/FriendEmpty.tsx'
import { PlanCard, PlanSheet } from '../components/PlanSheet.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { SlidingRow } from '../components/SlidingRow.tsx'
import { GoldenFork } from '../components/GoldenFork.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { catalog, slimById } from '../content/load.ts'
import { cityPath, type CityId } from '../lib/city.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import { demoFriendsEnabled } from '../lib/demo.ts'
import { cuisineLabel } from '../lib/cuisine-label.ts'
import { priceLabel, publicReference } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { Plan, SlimPlace } from '../types.ts'

export function PlansPage() {
  const app = useApp()
  const [params] = useSearchParams()
  const seed = params.get('place') ?? undefined
  const [sheet, setSheet] = useState(Boolean(seed))
  usePageMeta("Go together · Gusto's Guide", 'Make a plan, invite friends, vote on a place and a date.')
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-5xl italic">Go together</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn btn-coral" onClick={() => setSheet(true)}>New plan</button>
        <Link className="btn" to={cityPath('/plans/wizard')}>Plan dinner</Link>
      </div>
      {!app.user ? <p className="mt-3 text-sm">Sign in to host a plan. Friends you add are the only people invited.</p> : null}
      <ul className="mt-6 space-y-3">
        {app.plans.length === 0 ? <li className="text-sm">No plans yet. Start one when you know the night.</li> : null}
        {app.plans.map((plan) => (
          <li key={plan.id}><PlanCard planId={plan.id} /></li>
        ))}
      </ul>
      <PlanSheet open={sheet} onClose={() => setSheet(false)} seedPlaceId={seed} />
    </main>
  )
}

export function PlanDetailPage() {
  const { id = '' } = useParams()
  const app = useApp()
  const reduceMotion = useReducedMotion()
  const plan = app.plans.find((item) => item.id === id)
  const [placeId, setPlaceId] = useState(plan?.placeIds[0] ?? '')
  const [date, setDate] = useState(plan?.dates[0] ?? '')
  const [time, setTime] = useState('')
  usePageMeta(plan ? `${plan.title} · Plan` : 'Plan', 'Vote on where to eat and whether you are coming.')
  if (!plan) {
    return <main id="main" tabIndex={-1} className="mx-auto min-h-dvh max-w-3xl px-4 pt-28 outline-none"><h1 className="font-serif text-5xl italic">That plan wandered off.</h1></main>
  }
  const names = new Map<string, string>()
  for (const user of app.demoUsers) names.set(user.id, user.name)
  for (const user of app.friends) names.set(user.id, user.name)
  if (app.user) names.set(app.user.id, app.user.name)
  const tally = new Map<string, number>()
  for (const vote of Object.values(plan.votes)) if (vote.placeId) tally.set(vote.placeId, (tally.get(vote.placeId) ?? 0) + 1)
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <Link to={cityPath('/plans')} className="mt-2 inline-flex min-h-11 items-center text-sm font-bold">← Plans</Link>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide">{demoFriendsEnabled && plan.demo ? 'Seeded plan' : 'Your plan'}{plan.locked ? ' · Locked in' : ''}{plan.vibe ? ` · ${plan.vibe}` : ''}</p>
      <h1 className="font-serif text-5xl italic">{plan.title}</h1>
      {plan.locked ? <p className="mt-2">This dinner is locked in. The votes below are the record.</p> : null}
      {plan.locked ? <LockedMaps plan={plan} /> : null}
      <ul className="mt-4 space-y-3">
        {plan.placeIds.map((pid) => {
          const place = catalog.places.find((item) => item.id === pid)
          if (!place) return null
          const on = placeId === pid
          const votes = tally.get(pid) ?? 0
          return (
            <li key={pid}>
              <button
                type="button"
                className={`plan-pick place-row has-tail ${on ? 'is-on' : ''}`}
                aria-pressed={on}
                onClick={() => setPlaceId(pid)}
              >
                <span className="place-row-shot" style={reduceMotion ? undefined : { viewTransitionName: `place-${place.id}` }}>
                  <PlaceThumb place={place} uploads={app.photos} sizes="64px" />
                </span>
                <span className="place-row-copy">
                  <span className="block truncate font-serif text-2xl italic leading-tight">{place.name}</span>
                  <span className="mt-1 block truncate text-sm">{place.neighborhood} · {cuisineLabel(place.cuisine[0] ?? '')}</span>
                </span>
                <span className="score-col"><ScoreBadge score={app.gustoScore(place.id)} size="sm" /></span>
                <span className="row-tail">
                  <span className="block font-serif text-3xl italic leading-none">{votes}</span>
                  <span className="text-xs font-bold uppercase">{votes === 1 ? 'vote' : 'votes'}</span>
                  <span className={`pick-check ${on ? 'is-on' : ''}`} aria-hidden="true">✓</span>
                </span>
              </button>
              <Link className="btn plan-open mt-2 text-sm" to={`/place/${pid}`} viewTransition={!reduceMotion}>Open {place.name}</Link>
            </li>
          )
        })}
      </ul>
      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault()
          app.votePlan(plan.id, placeId, date, time)
        }}
      >
        <p className="text-sm font-bold">Date</p>
        <SlidingRow label="Vote for a date" className="mt-2">
          {plan.dates.map((item) => (
            <button key={item} type="button" className="chip" aria-pressed={date === item} onClick={() => setDate(item)}>{prettyDate(item)}</button>
          ))}
        </SlidingRow>
        <label className="field mt-3 max-w-xs"><span>Time</span>
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <button className="btn btn-coral mt-3" type="submit" disabled={!app.user || !placeId}>Cast vote</button>
      </form>
      <h2 className="mt-6 font-serif text-3xl italic">Are you coming?</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {(['yes', 'no', 'maybe'] as const).map((rsvp) => (
          <button key={rsvp} type="button" className={`btn text-sm ${app.user && plan.rsvps[app.user.id] === rsvp ? 'btn-coral' : ''}`} aria-pressed={app.user ? plan.rsvps[app.user.id] === rsvp : undefined} onClick={() => app.rsvpPlan(plan.id, rsvp)}>{rsvp === 'yes' ? 'Coming' : rsvp === 'no' ? 'Out' : 'Maybe'}</button>
        ))}
      </div>
      <ul className="rsvp-list mt-4">
        {Object.entries(plan.rsvps).length === 0 ? <li className="text-sm">No replies yet.</li> : null}
        {Object.entries(plan.rsvps).map(([userId, rsvp]) => {
          const label = names.get(userId) ?? 'Guest'
          return (
            <li key={userId} className="rsvp-row">
              <span className="avatar" aria-hidden="true">{initials(label)}</span>
              <span className="min-w-0 flex-1 truncate font-bold">{label}</span>
              <span className="tag">{rsvp === 'yes' ? 'Coming' : rsvp === 'no' ? 'Out' : 'Maybe'}</span>
            </li>
          )
        })}
      </ul>
      <button type="button" className="btn mt-4" onClick={() => void navigator.clipboard.writeText(app.inviteLink('plan', plan.id))}>Copy share link</button>
      <p className="mt-2 text-sm">{app.supabase ? 'This link lets someone join the plan after they sign in.' : 'This link opens the plan on this browser.'}</p>
    </main>
  )
}

function matchesVibe(place: SlimPlace, vibe: string): boolean {
  const guides = place.guideSlugs
  if (vibe === 'date') return guides.includes('date-night')
  if (vibe === 'cheap') return (place.price != null && place.price <= 2) || guides.includes('cheap-eats')
  if (vibe === 'late') return guides.includes('late-night')
  if (vibe === 'drinks') return guides.some((slug) => slug === 'cocktail-bars' || slug === 'wine-bars' || slug === 'beer' || slug === 'the-bar-list' || slug === 'happy-hour' || slug === 'fun-dive-bars')
  return place.price != null && place.price <= 3
}

function winningPlaceId(plan: Plan): string | undefined {
  const tally = new Map<string, number>()
  for (const vote of Object.values(plan.votes)) {
    if (vote.placeId) tally.set(vote.placeId, (tally.get(vote.placeId) ?? 0) + 1)
  }
  let best = ''
  let count = 0
  for (const [id, votes] of tally) {
    if (votes > count) {
      best = id
      count = votes
    }
  }
  return best || plan.placeIds[0]
}

function LockedMaps({ plan }: { plan: Plan }) {
  const place = slimById(winningPlaceId(plan) ?? '')
  if (!place) return null
  return (
    <div className="locked-card mt-4">
      <p className="text-xs font-bold uppercase tracking-wide">Go together</p>
      <p className="font-serif text-3xl italic">{place.name}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <MapLinks place={place} />
      </div>
    </div>
  )
}

const VIBE_CARDS = [
  { id: 'date', label: 'Date', emoji: '🕯️', line: 'Low light, a real table.' },
  { id: 'cheap', label: 'Cheap', emoji: '💵', line: 'Dinner that stays easy.' },
  { id: 'late', label: 'Late', emoji: '🌙', line: 'After the usual kitchens close.' },
  { id: 'drinks', label: 'Drinks', emoji: '🍸', line: 'A stool before the meal.' },
  { id: 'casual', label: 'Casual', emoji: '🌮', line: 'No speeches, just food.' },
] as const

const AVATAR = ['#ff5330', '#141f4d', '#38ba46', '#e7b23c']

function prettyDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function whereQuestion(city: CityId): string {
  if (city === 'la') return 'Where in Los Angeles?'
  if (city === 'peninsula') return 'Where on the Peninsula?'
  if (city === 'eastbay') return 'Where in the East Bay?'
  if (city === 'northbay') return 'Where in the North Bay?'
  if (city === 'sandiego') return 'Where in San Diego?'
  if (city === 'vancouver') return 'Where in Vancouver?'
  if (city === 'portland') return 'Where in Portland?'
  if (city === 'nyc') return 'Where in New York?'
  if (city === 'pullman') return 'Where in Pullman?'
  if (city === 'moscow') return 'Where in Moscow?'
  if (city === 'sf') return 'Where in San Francisco?'
  if (city === 'eastside') return 'Where on the Eastside?'
  return 'Where in Seattle?'
}

export function PlanWizardPage() {
  const app = useApp()
  const navigate = useNavigate()
  const { city, places } = useCityCatalog()
  const neighborhoods = useMemo(
    () => [...new Set(places.map((place) => place.neighborhood))].sort((a, b) => a.localeCompare(b)),
    [places],
  )
  const [step, setStep] = useState(0)
  const [friends, setFriends] = useState<string[]>([])
  const [area, setArea] = useState('any')
  const [vibe, setVibe] = useState<string>('casual')
  const [budget, setBudget] = useState(2)
  const [choice, setChoice] = useState('')
  const [celebrate, setCelebrate] = useState(false)
  const [signIn, setSignIn] = useState(false)
  usePageMeta("Plan dinner · Gusto's Guide", 'Pick friends, an area, a vibe, and a budget. Then vote and lock it in.', './og/og.png')

  const roster = app.friends.length
    ? app.friends.map((person) => ({ id: person.id, name: person.name, neighborhood: '', been: [] as string[], scores: {} as Record<string, number>, demo: false }))
    : app.demoUsers
  const friendPlaces = new Set(
    roster.filter((person) => friends.includes(person.id)).flatMap((person) => person.been),
  )
  const pool = places.filter((place) => {
    if (area !== 'any' && place.neighborhood !== area) return false
    if (place.price == null || place.price > budget) return false
    return true
  })
  const vibed = pool.filter((place) => matchesVibe(place, vibe))
  const base = vibed.length >= 3 ? vibed : pool
  const mine = base.filter((place) => app.statuses[place.id] === 'togo')
  const shared = mine.filter((place) => friendPlaces.has(place.id))
  const source = shared.length >= 3 ? shared : mine.length >= 3 ? mine : base
  const note = shared.length >= 3
    ? 'From To go overlaps with the friends you picked.'
    : mine.length >= 3
      ? 'From your To go list.'
      : vibed.length >= 3
        ? 'From the guide, matched to the area, vibe, and budget.'
        : 'The vibe was too tight, so this follows the area and budget.'
  const shortlist = source.slice(0, 5)
  const steps = ['Friends', 'Area', 'Vibe', 'Budget', 'Vote']

  const pickedFriends = roster.filter((person) => friends.includes(person.id))

  function lockIn() {
    if (!app.user || !choice || celebrate) return
    const names = pickedFriends.map((person) => person.name.split(' ')[0])
    const title = names.length ? `Dinner with ${names.join(', ')}` : 'Dinner'
    const id = app.createPlan(title, shortlist.map((place) => place.id), [new Date().toISOString().slice(0, 10)], {
      vibe,
      votePlaceId: choice,
      locked: true,
      inviteIds: friends,
    })
    if (!id) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      navigate(cityPath(`/plan/${id}`))
      return
    }
    setCelebrate(true)
    window.setTimeout(() => navigate(cityPath(`/plan/${id}`)), 900)
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <Link to={cityPath('/plans')} className="mt-2 inline-flex min-h-11 items-center text-sm font-bold">← Plans</Link>
      <h1 className="mt-3 font-serif text-5xl italic">Plan dinner</h1>
      <div className="wizard-progress mt-4" aria-hidden="true">
        <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-3 flex flex-wrap gap-2" aria-label="Wizard steps">
        {steps.map((label, index) => (
          <li key={label}>
            <button type="button" className="chip" aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}>
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>
      {step === 0 ? (
        <fieldset className="mt-6">
          <legend className="font-serif text-3xl italic">Who is coming?</legend>
          <p className="mt-2 text-sm">Friends you have accepted. Their To go lists stay private, so the shortlist uses yours.</p>
          {roster.length === 0 ? <div className="mt-3"><FriendEmpty onSignIn={() => setSignIn(true)} title="No friends yet" line="Add a username or email an invite. You can still plan dinner on your own." /></div> : null}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {roster.map((person, index) => {
              const on = friends.includes(person.id)
              return (
                <button
                  key={person.id}
                  type="button"
                  className={`avatar-card ${on ? 'is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => setFriends((current) => current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id])}
                >
                  <span className="avatar" style={{ background: AVATAR[index % AVATAR.length], color: AVATAR[index % AVATAR.length] === '#141f4d' ? '#fffaf3' : '#181818' }}>{initials(person.name)}</span>
                  <span className="font-serif text-2xl italic leading-none">{person.name}</span>
                  <span className="text-xs font-bold uppercase tracking-wide">{demoFriendsEnabled && person.demo ? person.neighborhood : 'Friend'}</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      ) : null}
      {step === 1 ? (
        <section className="mt-6" aria-label="Area">
          <h2 className="font-serif text-3xl italic">{whereQuestion(city)}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={area === 'any'} onClick={() => setArea('any')}>Anywhere</button>
            {neighborhoods.map((item) => (
              <button key={item} type="button" className="chip" aria-pressed={area === item} onClick={() => setArea(item)}>{item}</button>
            ))}
          </div>
          <p className="mt-4"><Link className="btn" to={cityPath('/explore')}>Open the map</Link></p>
        </section>
      ) : null}
      {step === 2 ? (
        <fieldset className="mt-6">
          <legend className="font-serif text-3xl italic">Vibe</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {VIBE_CARDS.map((item) => (
              <button key={item.id} type="button" className={`vibe-card ${vibe === item.id ? 'is-on' : ''}`} aria-pressed={vibe === item.id} onClick={() => setVibe(item.id)}>
                <span className="text-4xl" aria-hidden="true">{item.emoji}</span>
                <span>
                  <span className="block font-serif text-3xl italic leading-none">{item.label}</span>
                  <span className="mt-1 block text-sm">{item.line}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}
      {step === 3 ? (
        <section className="mt-6">
          <h2 className="font-serif text-3xl italic">Budget</h2>
          <p className="mt-2 font-serif text-5xl italic">{priceLabel(budget as 1 | 2 | 3 | 4)}</p>
          <label className="mt-4 block">
            <span className="sr-only">Maximum price</span>
            <input
              className="budget-slider"
              type="range"
              min={1}
              max={4}
              step={1}
              value={budget}
              aria-valuetext={`Up to ${priceLabel(budget as 1 | 2 | 3 | 4)}`}
              onChange={(event) => setBudget(Number(event.target.value))}
            />
          </label>
          <div className="mt-2 flex justify-between text-sm font-bold">
            <span>$</span><span>$$</span><span>$$$</span><span>$$$$</span>
          </div>
        </section>
      ) : null}
      {step === 4 ? (
        <section className="mt-6" aria-labelledby="shortlist">
          <h2 id="shortlist" className="font-serif text-3xl italic">Shortlist</h2>
          <p className="mt-2">{note}</p>
          {!app.user ? <p className="mt-2">Sign in to lock the plan in.</p> : null}
          <ul className="mt-3 space-y-3">
            {shortlist.map((place) => {
              const fans = pickedFriends.filter((person) => person.been.includes(place.id) || person.scores[place.id] !== undefined)
              const you = choice === place.id ? 1 : 0
              const tally = fans.length + you
              const reference = publicReference(place)
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    className={`vote-card place-row ${choice === place.id ? 'is-on' : ''}`}
                    aria-pressed={choice === place.id}
                    onClick={() => setChoice(place.id)}
                  >
                    <span className="place-row-shot">
                      <PlaceThumb place={place} uploads={app.photos} sizes="64px" />
                      <GoldenFork placeId={place.id} overlay />
                    </span>
                    <span className="place-row-copy">
                      <span className="block font-serif text-2xl italic leading-tight">{place.name}</span>
                      {reference ? <span className="public-ref mt-1 block">{reference}</span> : null}
                      <span className="mt-2 flex flex-wrap gap-1">
                        {tally > 0 ? <span className="tag">{tally} of you want to go</span> : null}
                        {place.price != null && place.price <= budget ? <span className="tag">Fits {priceLabel(place.price)}</span> : null}
                      </span>
                      <span className="mt-2 flex items-center gap-1">
                        {fans.map((person, index) => (
                          <span key={person.id} className="avatar avatar-sm" style={{ background: AVATAR[index % AVATAR.length], color: AVATAR[index % AVATAR.length] === '#141f4d' ? '#fffaf3' : '#181818' }} title={person.name}>{initials(person.name)}</span>
                        ))}
                        {you ? <span className="avatar avatar-sm" style={{ background: '#181818' }} title="Your vote">You</span> : null}
                        <span className="score-num ml-auto">{tally}</span>
                      </span>
                    </span>
                    <span className="score-col"><ScoreBadge score={app.gustoScore(place.id)} size="sm" /></span>
                  </button>
                </li>
              )
            })}
          </ul>
          {shortlist.length === 0 ? <p>No places match. Widen the area or the budget.</p> : null}
          <button type="button" className="btn btn-coral mt-4" disabled={!app.user || !choice} onClick={lockIn}>Lock it in</button>
        </section>
      ) : null}
      <div className="mt-6 flex gap-2">
        <button type="button" className="btn" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Back</button>
        {step < 4 ? <button type="button" className="btn btn-coral" onClick={() => setStep((value) => Math.min(4, value + 1))}>Next</button> : null}
      </div>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
      {celebrate ? (
        <div className="celebrate" role="status">
          <p className="font-serif text-6xl italic">Locked in.</p>
          {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ left: `${(index * 17) % 100}%`, animationDelay: `${index * 40}ms`, background: AVATAR[index % AVATAR.length] }} />)}
        </div>
      ) : null}
    </main>
  )
}
