import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GuideMap } from '../components/GuideMap.tsx'
import { MapLinks } from '../components/MapLinks.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { catalog, slimById } from '../content/load.ts'
import { priceLabel, publicReference } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { Plan, SlimPlace } from '../types.ts'

export function PlansPage() {
  const app = useApp()
  const navigate = useNavigate()
  const [title, setTitle] = useState('Friday night')
  const [picked, setPicked] = useState<string[]>([])
  const [date, setDate] = useState('2026-10-24')
  usePageMeta("Go together · Gusto's Guide", 'Make a plan, invite friends, vote on a place and a date.')
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <h1 className="font-serif text-5xl italic">Go together</h1>
      <p className="mt-3"><Link className="btn btn-coral" to="/plans/wizard">Plan dinner</Link></p>
      <ul className="mt-4 space-y-2">
        {app.plans.map((plan) => (
          <li key={plan.id}><Link className="font-serif text-2xl italic" to={`/plan/${plan.id}`}>{plan.title}</Link>{plan.demo ? ' · Demo' : ''}</li>
        ))}
      </ul>
      <form
        className="mt-8 border-2 border-ink p-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!app.user || picked.length === 0) return
          const id = app.createPlan(title, picked, [date])
          if (id) navigate(`/plan/${id}`)
        }}
      >
        <h2 className="font-serif text-3xl italic">New plan</h2>
        {!app.user ? <p className="mt-2 text-sm">Sign in to host. You can still open the demo plan.</p> : null}
        <label className="field mt-3"><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="field mt-3"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <p className="mt-3 text-sm font-bold">Pick up to 3 places</p>
        <ul className="mt-2 max-h-64 space-y-1 overflow-auto">
          {catalog.places.slice(0, 30).map((place) => (
            <li key={place.id}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={picked.includes(place.id)}
                  onChange={() => setPicked((current) => (current.includes(place.id) ? current.filter((id) => id !== place.id) : current.length >= 3 ? current : [...current, place.id]))}
                />
                {place.name}
              </label>
            </li>
          ))}
        </ul>
        <button className="btn btn-coral mt-4" type="submit" disabled={!app.user}>Create plan</button>
      </form>
    </main>
  )
}

export function PlanDetailPage() {
  const { id = '' } = useParams()
  const app = useApp()
  const plan = app.plans.find((item) => item.id === id)
  const [placeId, setPlaceId] = useState(plan?.placeIds[0] ?? '')
  const [date, setDate] = useState(plan?.dates[0] ?? '')
  usePageMeta(plan ? `${plan.title} · Plan` : 'Plan', 'Vote on where to eat and whether you are coming.')
  if (!plan) {
    return <main className="mx-auto max-w-3xl px-4 pt-28"><h1 className="font-serif text-5xl italic">That plan wandered off.</h1></main>
  }
  const names = new Map(app.demoUsers.map((user) => [user.id, `${user.name} · Demo`]))
  if (app.user) names.set(app.user.id, app.user.name)
  const tally = new Map<string, number>()
  for (const vote of Object.values(plan.votes)) if (vote.placeId) tally.set(vote.placeId, (tally.get(vote.placeId) ?? 0) + 1)
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <Link to="/plans" className="text-sm font-bold">← Plans</Link>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide">{plan.demo ? 'Demo plan' : 'Your plan'}{plan.locked ? ' · Locked in' : ''}{plan.vibe ? ` · ${plan.vibe}` : ''}</p>
      <h1 className="font-serif text-5xl italic">{plan.title}</h1>
      {plan.locked ? <p className="mt-2">This dinner is locked in. The votes below are the record.</p> : null}
      {plan.locked ? <LockedMaps plan={plan} /> : null}
      <ul className="mt-4 space-y-2">
        {plan.placeIds.map((pid) => {
          const place = catalog.places.find((item) => item.id === pid)
          if (!place) return null
          return <li key={pid}><Link className="font-bold" to={`/place/${pid}`}>{place.name}</Link> · {tally.get(pid) ?? 0} votes</li>
        })}
      </ul>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          app.votePlan(plan.id, placeId, date)
        }}
      >
        <label className="field"><span>Vote for a place</span>
          <select value={placeId} onChange={(event) => setPlaceId(event.target.value)}>
            {plan.placeIds.map((pid) => <option key={pid} value={pid}>{catalog.places.find((place) => place.id === pid)?.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Vote for a date</span>
          <select value={date} onChange={(event) => setDate(event.target.value)}>
            {plan.dates.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <button className="btn btn-coral" type="submit" disabled={!app.user}>Cast vote</button>
      </form>
      <div className="mt-4 flex gap-2">
        {(['yes', 'no', 'maybe'] as const).map((rsvp) => (
          <button key={rsvp} type="button" className="btn text-sm" onClick={() => app.rsvpPlan(plan.id, rsvp)}>{rsvp}</button>
        ))}
      </div>
      <h2 className="mt-6 font-serif text-3xl italic">RSVPs</h2>
      <ul className="mt-2">
        {Object.entries(plan.rsvps).map(([userId, rsvp]) => <li key={userId}>{names.get(userId) ?? userId}: {rsvp}</li>)}
      </ul>
      <button type="button" className="btn mt-4" onClick={() => void navigator.clipboard.writeText(app.inviteLink('plan', plan.id))}>Copy share link</button>
      <p className="mt-2 text-sm">This link opens the plan on this browser.</p>
    </main>
  )
}

function matchesVibe(place: SlimPlace, vibe: string): boolean {
  const guides = place.guideSlugs
  if (vibe === 'date') return guides.includes('date-night')
  if (vibe === 'cheap') return place.price <= 2 || guides.includes('cheap-eats')
  if (vibe === 'late') return guides.includes('late-night')
  if (vibe === 'drinks') return guides.some((slug) => slug === 'cocktail-bars' || slug === 'wine-bars' || slug === 'beer' || slug === 'the-bar-list' || slug === 'happy-hour')
  return place.price <= 3
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
    <div className="mt-4 border-2 border-ink bg-[#fffaf3] p-4">
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

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function PlanWizardPage() {
  const app = useApp()
  const navigate = useNavigate()
  const neighborhoods = useMemo(
    () => [...new Set(catalog.places.map((place) => place.neighborhood))].sort((a, b) => a.localeCompare(b)),
    [],
  )
  const [step, setStep] = useState(0)
  const [friends, setFriends] = useState<string[]>([])
  const [area, setArea] = useState('any')
  const [vibe, setVibe] = useState<string>('casual')
  const [budget, setBudget] = useState(2)
  const [choice, setChoice] = useState('')
  const [celebrate, setCelebrate] = useState(false)
  usePageMeta("Plan dinner · Gusto's Guide", 'Pick friends, an area, a vibe, and a budget. Then vote and lock it in.', './og/og.svg')

  const friendPlaces = new Set(
    app.demoUsers.filter((person) => friends.includes(person.id)).flatMap((person) => person.been),
  )
  const pool = catalog.places.filter((place) => {
    if (area !== 'any' && place.neighborhood !== area) return false
    if (place.price > budget) return false
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

  const areaPins = (area === 'any'
    ? neighborhoods.map((name) => catalog.places.find((place) => place.neighborhood === name)).filter((place): place is SlimPlace => place != null)
    : catalog.places.filter((place) => place.neighborhood === area)
  ).slice(0, 24)
  const pickedFriends = app.demoUsers.filter((person) => friends.includes(person.id))

  function lockIn() {
    if (!app.user || !choice || celebrate) return
    const names = pickedFriends.map((person) => person.name.split(' ')[0])
    const title = names.length ? `Dinner with ${names.join(', ')}` : 'Dinner'
    const id = app.createPlan(title, shortlist.map((place) => place.id), [new Date().toISOString().slice(0, 10)], {
      vibe,
      votePlaceId: choice,
      locked: true,
    })
    if (!id) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      navigate(`/plan/${id}`)
      return
    }
    setCelebrate(true)
    window.setTimeout(() => navigate(`/plan/${id}`), 900)
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <Link to="/plans" className="text-sm font-bold">← Plans</Link>
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
          <p className="mt-2 text-sm">Demo friends. Picking them looks for To go overlaps with places they have been.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {app.demoUsers.map((person, index) => {
              const on = friends.includes(person.id)
              return (
                <button
                  key={person.id}
                  type="button"
                  className={`avatar-card ${on ? 'is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => setFriends((current) => current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id])}
                >
                  <span className="avatar" style={{ background: AVATAR[index % AVATAR.length] }}>{initials(person.name)}</span>
                  <span className="font-serif text-2xl italic leading-none">{person.name}</span>
                  <span className="text-xs font-bold uppercase tracking-wide">{person.neighborhood} · Demo</span>
                </button>
              )
            })}
          </div>
        </fieldset>
      ) : null}
      {step === 1 ? (
        <section className="mt-6" aria-label="Area">
          <h2 className="font-serif text-3xl italic">Where in Seattle?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="chip" aria-pressed={area === 'any'} onClick={() => setArea('any')}>Anywhere</button>
            {neighborhoods.map((item) => (
              <button key={item} type="button" className="chip" aria-pressed={area === item} onClick={() => setArea(item)}>{item}</button>
            ))}
          </div>
          <div className="mt-4 h-56">
            <GuideMap places={areaPins} statuses={app.statuses} />
          </div>
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
                    className={`vote-card ${choice === place.id ? 'is-on' : ''}`}
                    aria-pressed={choice === place.id}
                    onClick={() => setChoice(place.id)}
                  >
                    <span className="h-24 w-28 shrink-0 overflow-hidden bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                      <PlaceThumb place={place} uploads={app.photos} />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <ScoreBadge score={app.gustoScore(place.id)} size="sm" />
                      <span className="mt-1 block font-serif text-2xl italic leading-none">{place.name}</span>
                      {reference ? <span className="public-ref mt-1 block">{reference}</span> : null}
                      <span className="mt-2 flex flex-wrap gap-1">
                        {tally > 0 ? <span className="tag">{tally} of you want to go</span> : null}
                        {place.price <= budget ? <span className="tag">Fits {priceLabel(place.price)}</span> : null}
                      </span>
                      <span className="mt-2 flex items-center gap-1">
                        {fans.map((person, index) => (
                          <span key={person.id} className="avatar avatar-sm" style={{ background: AVATAR[index % AVATAR.length] }} title={`${person.name} · Demo`}>{initials(person.name)}</span>
                        ))}
                        {you ? <span className="avatar avatar-sm" style={{ background: '#181818' }} title="Your vote">You</span> : null}
                        <span className="ml-auto font-serif text-3xl italic">{tally}</span>
                      </span>
                    </span>
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
      {celebrate ? (
        <div className="celebrate" role="status">
          <p className="font-serif text-6xl italic">Locked in.</p>
          {Array.from({ length: 18 }, (_, index) => <i key={index} style={{ left: `${(index * 17) % 100}%`, animationDelay: `${index * 40}ms`, background: AVATAR[index % AVATAR.length] }} />)}
        </div>
      ) : null}
    </main>
  )
}
