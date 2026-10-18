import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { catalog } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

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
      <p className="mt-3 text-xs font-bold uppercase tracking-wide">{plan.demo ? 'Demo plan' : 'Your plan'}</p>
      <h1 className="font-serif text-5xl italic">{plan.title}</h1>
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
      <button type="button" className="btn mt-4" onClick={() => void navigator.clipboard.writeText(`${location.origin}${location.pathname}#/plan/${plan.id}`)}>Copy share link</button>
    </main>
  )
}
