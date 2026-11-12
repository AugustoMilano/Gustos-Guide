import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { NightBox } from '../components/NightBox.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { areaPhrase, cityPath } from '../lib/city.ts'
import { cuisineLabel } from '../lib/cuisine-label.ts'
import { priceLabel } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import {
  acceptNightIntent,
  nightExamples,
  parseNightQuery,
  planNight,
  selectIntent,
  type NightIntent,
  type NightResult,
} from '../lib/night-plan.ts'
import { useApp } from '../state/AppState.tsx'
import { useCityCatalog } from '../lib/use-city.ts'

const ItineraryMap = lazy(() => import('../components/GuideMap.tsx').then((module) => ({ default: module.ItineraryMap })))

function submitQuery(value: string, setParams: ReturnType<typeof useSearchParams>[1]) {
  const next = value.trim()
  setParams(next ? { q: next } : {}, { replace: true })
}

export function NightPage() {
  const { city, places, guides, ready, failed } = useCityCatalog()
  const { gustoScore, photos } = useApp()
  const area = areaPhrase(city)
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const [draft, setDraft] = useState(q)
  const [active, setActive] = useState<string | null>(null)
  const [modelIntent, setModelIntent] = useState<NightIntent | null>(null)
  const [modelFor, setModelFor] = useState('')
  usePageMeta(q ? `${q.slice(0, 70)} · Plan my night · Gusto's Guide` : "Plan my night · Gusto's Guide", `Plan a night in ${area} from places already in the guide.`)

  useEffect(() => {
    setDraft(q)
  }, [q])

  const planned = useMemo(() => {
    if (!ready || !q.trim()) return null
    const local = parseNightQuery(q, places)
    const picked = selectIntent(local, modelFor === q ? modelIntent : null)
    const plan = planNight(q, city, places, guides, gustoScore, new Date(), picked.intent)
    return { usedModel: picked.usedModel, plan }
  }, [ready, q, places, city, guides, gustoScore, modelFor, modelIntent])

  const signature = planned?.plan.picks.map((pick) => pick.place.id).join('|') ?? ''
  const planRef = useRef<NightResult | null>(null)
  planRef.current = planned?.plan ?? null
  const pins = useMemo(() => {
    if (!signature) return []
    const plan = planRef.current
    if (!plan) return []
    return plan.picks.map((pick) => ({
      id: pick.place.id,
      name: pick.place.name,
      neighborhood: pick.place.neighborhood,
      lat: pick.place.lat,
      lng: pick.place.lng,
      address: pick.place.address,
    }))
  }, [signature])

  useEffect(() => {
    setActive(null)
  }, [signature])

  useEffect(() => {
    if (!ready || !q.trim()) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 4500)
    const placesNow = places
    fetch('/api/plan-night', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: q.slice(0, 400), city }),
    })
      .then((response) => (response.ok ? response.json() as Promise<{ source?: string; intent?: unknown }> : null))
      .then((body) => {
        if (controller.signal.aborted) return
        if (!body || body.source === 'fallback' || body.intent == null) {
          setModelIntent(null)
          setModelFor(q)
          return
        }
        setModelIntent(acceptNightIntent(body.intent, q, placesNow))
        setModelFor(q)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        setModelIntent(null)
        setModelFor(q)
      })
      .finally(() => window.clearTimeout(timer))
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
    // places is a fresh array each render; the catalog behind `ready` is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, ready])

  const examples = nightExamples(city)
  const plan = planned?.plan ?? null

  return (
    <main id="main" tabIndex={-1} className="night-page mx-auto max-w-6xl px-4 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-5xl italic">Plan my night</h1>
      <p className="mt-3 max-w-xl text-sm">Say what you want, or the stops in order. Every pick is a place already in the {area} guide.</p>
      <div className="mt-4 max-w-xl">
        <NightBox
          id="night-query"
          value={draft}
          onChange={setDraft}
          onSubmit={(value) => submitQuery(value, setParams)}
          examples={examples}
          placeholder={examples[0]?.query ?? 'drinks, then dinner, then dessert'}
          rows={5}
        />
      </div>
      {failed ? <p className="mt-6">The guide list didn't load. <button type="button" className="btn" onClick={() => window.location.reload()}>Try again</button></p> : null}
      {q && !ready && !failed ? (
        <div className="mt-6 grid gap-2" aria-hidden="true">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
      ) : null}
      {plan ? (
        <div className="mt-6">
          <h2 className="font-serif text-3xl italic">{plan.summary}</h2>
          {planned?.usedModel ? <p className="mt-2 text-sm">Read from the wording, then matched to the guide.</p> : null}
          {plan.gaps.length ? (
            <div className="mt-3" role="status">
              {plan.gaps.map((gap) => <p key={gap} className="text-sm">{gap}</p>)}
            </div>
          ) : null}
          {plan.picks.length ? (
            <div className="night-layout mt-4">
              <div>
                <ol className="grid gap-3">
                  {plan.picks.map((pick, index) => (
                    <li key={pick.place.id}>
                      {index > 0 && plan.legs[index - 1] ? <p className="night-leg">{plan.legs[index - 1].label}</p> : null}
                      <Link
                        to={cityPath(`/place/${pick.place.id}`)}
                        className="hit-card night-card"
                        data-night-stop={index + 1}
                        onMouseEnter={() => setActive(pick.place.id)}
                        onFocus={() => setActive(pick.place.id)}
                      >
                        <span className="night-kicker">
                          <span className="rank-pip">{index + 1}</span>
                          {pick.label}
                        </span>
                        <span className="place-row">
                          <span className="place-row-shot">
                            <PlaceThumb place={pick.place} uploads={photos} sizes="64px" />
                          </span>
                          <span className="place-row-copy">
                            <span className="block font-serif text-2xl italic leading-tight">{pick.place.name}</span>
                            <span className="mt-1 block text-sm">
                              {[pick.place.neighborhood, pick.place.cuisine[0] ? cuisineLabel(pick.place.cuisine[0]) : '', priceLabel(pick.place.price)].filter(Boolean).join(' · ')}
                            </span>
                            <span className="mt-1 block text-sm">{pick.why}</span>
                          </span>
                          <span className="score-col">
                            <ScoreBadge score={gustoScore(pick.place.id)} size="sm" />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="night-map" aria-label="Stops on the map">
                <Suspense fallback={<div className="skeleton h-full" aria-hidden="true" />}>
                  <ItineraryMap places={pins} activeId={active} onSelect={setActive} />
                </Suspense>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}
