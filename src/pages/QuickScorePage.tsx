import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CollectionMembership } from '../components/CollectionMembership.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { scoreBand } from '../components/ScoreBadge.tsx'
import { catalog } from '../content/load.ts'
import { cityPath } from '../lib/city.ts'
import { publicReference } from '../lib/format.ts'
import { usePageMeta } from '../lib/meta.ts'
import {
  digitsFromScore,
  parseScoreDigits,
  pushScoreDigit,
  quickQueue,
  type QuickRegion,
} from '../lib/quick-score.ts'
import { useApp } from '../state/AppState.tsx'

const WHOLES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const TENTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

type Undo = { placeId: string; score: number | null; mark: 'havent' | null; summary: string }

function tick() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  navigator.vibrate?.(10)
}

export function QuickScorePage() {
  const app = useApp()
  const reduce = useReducedMotion()
  const [signIn, setSignIn] = useState(false)
  const [region, setRegion] = useState<QuickRegion>('all')
  const [neighborhood, setNeighborhood] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [unscoredOnly, setUnscoredOnly] = useState(true)
  const [haventOnly, setHaventOnly] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [pin, setPin] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const draftRef = useRef(draft)
  function writeDraft(next: string) {
    draftRef.current = next
    setDraft(next)
  }
  const [scoring, setScoring] = useState(false)
  const [direction, setDirection] = useState(0)
  const [undoStack, setUndoStack] = useState<Undo[]>([])
  const [note, setNote] = useState('')
  const [nudge, setNudge] = useState<'left' | 'right' | null>(null)
  usePageMeta("Quick score · Gusto's Guide", 'Score one place at a time, across every region.', './og/og.png')

  const owner = Boolean(app.user?.isOwner)
  const filterKey = `${region}|${neighborhood}|${cuisine}|${unscoredOnly}|${haventOnly}`
  const [seenFilter, setSeenFilter] = useState(filterKey)
  if (seenFilter !== filterKey) {
    setSeenFilter(filterKey)
    setCursor(0)
    setPin(null)
  }

  const scoped = catalog.places.filter((place) => !place.closed && (region === 'all' || (place.city ?? 'seattle') === region))
  const neighborhoods = [...new Set(scoped.map((place) => place.neighborhood))].sort((a, b) => a.localeCompare(b))
  const cuisines = [...new Set(scoped.flatMap((place) => place.cuisine))].sort((a, b) => a.localeCompare(b))
  if (neighborhood && !neighborhoods.includes(neighborhood)) setNeighborhood('')
  if (cuisine && !cuisines.includes(cuisine)) setCuisine('')

  const queue = owner
    ? quickQueue(catalog.places.filter((place) => !place.closed), {
        region,
        neighborhood,
        cuisine,
        unscoredOnly,
        haventOnly,
        score: app.gustoScore,
        mark: app.houseMark,
      })
    : []
  const pinned = pin ? queue.findIndex((place) => place.id === pin) : -1
  const index = queue.length === 0 ? 0 : pinned >= 0 ? pinned : Math.min(cursor, queue.length - 1)
  const place = queue[index]
  const scored = catalog.places.filter((item) => !item.closed && app.gustoScore(item.id) != null).length
  const total = catalog.places.filter((item) => !item.closed).length
  const pending = parseScoreDigits(draft)
  const whole = pending == null ? null : Math.min(10, Math.floor(pending + 1e-6))
  const tenth = pending == null ? null : Math.round((pending - Math.floor(pending + 1e-6)) * 10)
  const band = pending == null ? null : scoreBand(pending)

  const placeId = place?.id
  const [shownId, setShownId] = useState(placeId)
  if (placeId !== shownId) {
    setShownId(placeId)
    if (pin !== placeId) {
      setDraft('')
      setScoring(false)
    }
  }

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  function remember(summary: string) {
    if (!place) return
    setUndoStack((stack) => [...stack, { placeId: place.id, score: app.gustoScore(place.id), mark: app.houseMark(place.id), summary }])
  }

  function save(value: number) {
    if (!place) return
    const next = Math.round(value * 10) / 10
    if (next < 0 || next > 10) return
    remember(`Scored ${place.name} ${next.toFixed(1)}`)
    tick()
    setDirection(1)
    setPin(null)
    app.setHouseScore(place.id, next)
    writeDraft('')
    setScoring(false)
    setNote(`Scored ${place.name} ${next.toFixed(1)}.`)
  }

  function havent() {
    if (!place) return
    remember(`Marked ${place.name} as haven't been`)
    tick()
    setDirection(-1)
    setPin(null)
    app.setHouseScore(place.id, null)
    app.setHouseMark(place.id, 'havent')
    writeDraft('')
    setScoring(false)
    setNote(`Marked ${place.name} as haven't been.`)
  }

  function skip() {
    if (queue.length < 2) {
      setNote('Only one place in this pass.')
      return
    }
    setDirection(1)
    setPin(null)
    setCursor((index + 1) % queue.length)
    setNote(`Skipped ${place?.name ?? 'this place'}.`)
  }

  function undo() {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setUndoStack((stack) => stack.slice(0, -1))
    app.setHouseScore(prev.placeId, prev.score)
    app.setHouseMark(prev.placeId, prev.mark)
    setPin(prev.placeId)
    writeDraft(prev.score == null ? '' : digitsFromScore(prev.score))
    setScoring(true)
    setDirection(0)
    const name = catalog.places.find((item) => item.id === prev.placeId)?.name ?? 'that place'
    setNote(`Undid the last mark on ${name}.`)
  }

  const actions = useRef({ save, havent, skip, undo })
  useEffect(() => {
    actions.current = { save, havent, skip, undo }
  })

  useEffect(() => {
    if (!owner) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('input, select, textarea, [contenteditable="true"]')) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (/^\d$/.test(event.key)) {
        event.preventDefault()
        setScoring(true)
        writeDraft(pushScoreDigit(draftRef.current, event.key))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const value = parseScoreDigits(draftRef.current)
        if (value != null) actions.current.save(value)
        return
      }
      const key = event.key.toLowerCase()
      if (key === 'n') {
        event.preventDefault()
        actions.current.havent()
      } else if (key === 's') {
        event.preventDefault()
        actions.current.skip()
      } else if (key === 'z') {
        event.preventDefault()
        actions.current.undo()
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        writeDraft(draftRef.current.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [owner])

  return (
    <main id="main" tabIndex={-1} className="quick-score mx-auto max-w-xl px-4 pt-24 pb-16 outline-none">
      <p className="text-sm font-bold tracking-wide text-navy uppercase">House</p>
      <h1 className="mt-1 font-serif text-4xl italic sm:text-5xl">Quick score</h1>
      <p className="mt-2 text-sm">{scored} of {total} scored. Seattle, the Eastside, Los Angeles, San Francisco, the East Bay, the Peninsula, and the North Bay.</p>
      {app.announcement ? <p className="mt-3 text-sm" role="status">{app.announcement}</p> : null}
      <div
        className="quick-meter mt-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={scored}
        aria-label={`${scored} of ${total} scored`}
      >
        <span style={{ width: `${total ? (scored / total) * 100 : 0}%` }} />
      </div>
      {!app.user ? (
        <div className="friend-empty mt-4">
          <p className="font-serif text-2xl italic">Sign in to score.</p>
          <p className="mt-1 text-sm">House scores stay with the house.</p>
          <button type="button" className="btn btn-coral mt-3" onClick={() => setSignIn(true)}>Sign in</button>
        </div>
      ) : !owner ? (
        <p className="mt-4">Quick score is only for the house. Your own ranks stay on Rank.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn text-sm" aria-pressed={unscoredOnly} onClick={() => setUnscoredOnly((value) => !value)}>Unscored only</button>
            <button type="button" className="btn text-sm" aria-pressed={haventOnly} onClick={() => setHaventOnly((value) => !value)}>Haven't been</button>
            <p className="self-center text-sm">{queue.length} in this pass</p>
          </div>
          <details className="glass mt-3 p-3">
            <summary className="min-h-11 cursor-pointer text-sm font-bold">Filters</summary>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="field">
                <span>Region</span>
                <select value={region} onChange={(event) => setRegion(event.target.value as QuickRegion)}>
                  <option value="all">All regions</option>
                  <option value="seattle">Seattle</option>
                  <option value="eastside">Eastside</option>
                  <option value="la">Los Angeles</option>
                  <option value="sf">San Francisco</option>
                  <option value="eastbay">East Bay</option>
                  <option value="peninsula">Peninsula</option>
                  <option value="northbay">North Bay</option>
                </select>
              </label>
              <label className="field">
                <span>Neighborhood</span>
                <select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)}>
                  <option value="">Any</option>
                  {neighborhoods.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Cuisine</span>
                <select value={cuisine} onChange={(event) => setCuisine(event.target.value)}>
                  <option value="">Any</option>
                  {cuisines.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
              </label>
            </div>
          </details>
          {place ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.article
                key={place.id}
                className="mt-4"
                initial={reduce ? false : { x: direction * 72, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={reduce ? undefined : { x: direction * -110, opacity: 0 }}
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              >
                <div className="glass quick-card overflow-hidden">
                  <motion.div
                    className="quick-photo relative h-24 cursor-grab overflow-hidden bg-navy sm:h-64"
                    drag={reduce ? false : 'x'}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.4}
                    dragSnapToOrigin
                    onDrag={(_, info) => {
                      if (info.offset.x <= -36) setNudge('left')
                      else if (info.offset.x >= 36) setNudge('right')
                      else setNudge(null)
                    }}
                    onDragEnd={(_, info) => {
                      setNudge(null)
                      if (info.offset.x <= -72) havent()
                      else if (info.offset.x >= 72) setScoring(true)
                    }}
                  >
                    <div className="pointer-events-none h-full [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                      <PlaceThumb place={place} uploads={app.photos} eager priority sizes="(min-width: 640px) 36rem, 100vw" />
                    </div>
                    <span className={`quick-nudge is-left${nudge === 'left' ? ' is-on' : ''}`}>Haven't been</span>
                    <span className={`quick-nudge is-right${nudge === 'right' ? ' is-on' : ''}`}>Score</span>
                  </motion.div>
                  <div className="p-4">
                    <h2 className="font-serif text-4xl italic leading-none">
                      <Link to={cityPath(`/place/${place.id}`)}>{place.name}</Link>
                    </h2>
                    <p className="mt-2 text-sm">{place.neighborhood} · {place.cuisine.join(', ')}</p>
                    {publicReference(place) ? <p className="public-ref mt-2">{publicReference(place)}</p> : null}
                    <CollectionMembership placeId={place.id} city={place.city ?? 'seattle'} compact />
                    <p className="mt-2 text-sm lg:hidden">Swipe the photo left if you haven't been, right to score.</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
                  <button type="button" className="btn btn-coral lg:hidden" onClick={() => setScoring(true)}>Score</button>
                  <button type="button" className="btn" onClick={havent}>Haven't been</button>
                  <button type="button" className="btn" onClick={skip}>Skip</button>
                  <button type="button" className="btn" onClick={undo} disabled={undoStack.length === 0}>Undo last</button>
                </div>
                {undoStack.length ? <p className="mt-2 text-sm">Last: {undoStack[undoStack.length - 1].summary}</p> : null}
                <div className={scoring ? 'quick-score-panel is-open' : 'quick-score-panel'}>
                  <div className="score-dial mt-3">
                    <button type="button" className="btn score-step" aria-label="Lower by 0.1" disabled={pending == null || pending <= 0} onClick={() => writeDraft(digitsFromScore((pending ?? 0) - 0.1))}>−</button>
                    <p className="score-readout" aria-live="polite">
                      <strong>{pending == null ? '—' : pending.toFixed(1)}</strong>
                      <span>{band ? band.label : 'Type a score'}</span>
                    </p>
                    <button type="button" className="btn score-step" aria-label="Raise by 0.1" disabled={pending != null && pending >= 10} onClick={() => writeDraft(digitsFromScore((pending ?? -0.1) + 0.1))}>+</button>
                  </div>
                  <label className="mt-3 block text-sm font-bold">
                    Score
                    <input
                      className="quick-slider"
                      type="range"
                      min={0}
                      max={10}
                      step={0.1}
                      value={pending ?? 0}
                      aria-valuetext={pending == null ? 'No score yet' : pending.toFixed(1)}
                      style={{ ['--fill' as string]: `${((pending ?? 0) / 10) * 100}%` }}
                      onChange={(event) => writeDraft(digitsFromScore(Number(event.target.value)))}
                    />
                  </label>
                  <div className="chip-row quick-keys mt-2" role="group" aria-label="Whole number">
                    {WHOLES.map((n) => (
                      <button key={n} type="button" className="chip" aria-pressed={whole === n} onClick={() => (n === 10 ? save(10) : writeDraft(digitsFromScore(n + (tenth != null && whole != null && whole < 10 ? tenth : 0) / 10)))}>{n}</button>
                    ))}
                  </div>
                  <div className="chip-row quick-keys mt-1" role="group" aria-label="Tenths">
                    {TENTHS.map((step) => (
                      <button key={step} type="button" className="chip" aria-pressed={tenth === step && whole != null && whole < 10} disabled={whole == null || whole >= 10} onClick={() => whole != null && save(whole + step / 10)}>.{step}</button>
                    ))}
                  </div>
                  <button type="button" className="btn btn-coral mt-3 w-full" disabled={pending == null} onClick={() => pending != null && save(pending)}>
                    {pending == null ? 'Save score' : `Save ${pending.toFixed(1)}`}
                  </button>
                </div>
              </motion.article>
            </AnimatePresence>
          ) : (
            <p className="mt-6 font-serif text-3xl italic">Nothing in this pass.</p>
          )}
          <ul className="key-hints mt-4" aria-label="Keyboard shortcuts">
            <li><kbd>0–9</kbd> score</li>
            <li><kbd>Enter</kbd> save</li>
            <li><kbd>N</kbd> haven't been</li>
            <li><kbd>S</kbd> skip</li>
            <li><kbd>Z</kbd> undo last</li>
          </ul>
        </>
      )}
      <p className="sr-only" aria-live="polite">{note}</p>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
  )
}
