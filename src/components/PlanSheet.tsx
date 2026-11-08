import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { FriendEmpty } from './FriendEmpty.tsx'
import { Modal } from './Modal.tsx'
import { SlidingRow } from './SlidingRow.tsx'
import { demoFriendsEnabled } from '../lib/demo.ts'
import { PlaceThumb } from './PlaceThumb.tsx'
import { ScoreBadge } from './ScoreBadge.tsx'
import { SignInSheet } from './SignInSheet.tsx'
import { catalog } from '../content/load.ts'
import { cityPath } from '../lib/city.ts'
import { cuisineLabel } from '../lib/cuisine-label.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import { isPlaceOpen } from '../lib/hours.ts'
import { useApp } from '../state/AppState.tsx'
import type { SlimPlace } from '../types.ts'

type Filter =
  | { kind: 'mix' }
  | { kind: 'togo' }
  | { kind: 'friends' }
  | { kind: 'open' }
  | { kind: 'hood'; name: string }
  | { kind: 'guide'; slug: string; title: string }

function localDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function upcomingFriday(): string {
  const date = new Date()
  const add = (5 - date.getDay() + 7) % 7 || 7
  date.setDate(date.getDate() + add)
  return localDate(date)
}

function prettyDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function whenFrom(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = (time || '19:00').split(':').map(Number)
  return new Date(year || 2026, (month || 1) - 1, day || 1, hour || 19, minute || 0, 0, 0)
}

function initials(name: string): string {
  return name.split(' ').map((part) => part[0] ?? '').join('').slice(0, 2).toUpperCase()
}

const AVATAR = ['#ff5330', '#141f4d', '#38ba46', '#e7b23c']

export function PlanSheet({ open, onClose, seedPlaceId }: { open: boolean; onClose: () => void; seedPlaceId?: string }) {
  const app = useApp()
  const { places, guides: cityGuides } = useCityCatalog()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [title, setTitle] = useState('Friday night')
  const [date, setDate] = useState(upcomingFriday)
  const [time, setTime] = useState('19:00')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>({ kind: 'mix' })
  const [picked, setPicked] = useState<string[]>([])
  const [invited, setInvited] = useState<string[]>([])
  const [signIn, setSignIn] = useState(false)
  const [full, setFull] = useState(false)

  useEffect(() => {
    if (!open || !seedPlaceId) return
    setPicked((current) => current.includes(seedPlaceId) ? current : [seedPlaceId, ...current].slice(0, 3))
  }, [open, seedPlaceId])

  const toGo = useMemo(
    () => new Set(Object.entries(app.statuses).filter(([, status]) => status === 'togo').map(([id]) => id)),
    [app.statuses],
  )
  const hoods = useMemo(() => {
    const counts = new Map<string, number>()
    for (const place of places) counts.set(place.neighborhood, (counts.get(place.neighborhood) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name)
  }, [places])
  const guides = useMemo(
    () => cityGuides.filter((guide) => guide.group === 'Best of' || guide.group === 'Occasion').slice(0, 4),
    [cityGuides],
  )
  const roster = [
    ...app.friends.map((person) => ({ id: person.id, name: person.name, demo: false })),
    ...app.demoUsers.map((person) => ({ id: person.id, name: person.name, demo: true })),
  ]

  const results = useMemo(() => {
    const night = whenFrom(date, time)
    const friendIds = new Set<string>()
    if (demoFriendsEnabled && !app.supabase) {
      for (const person of app.demoUsers) {
        for (const id of person.been) friendIds.add(id)
        for (const id of Object.keys(person.scores)) friendIds.add(id)
      }
    } else {
      for (const place of catalog.places) {
        if (app.friendScore(place.id).count > 0) friendIds.add(place.id)
      }
    }
    const q = query.trim().toLowerCase()
    const matches = (place: SlimPlace) => {
      if (q && !`${place.name} ${place.neighborhood} ${place.cuisine.join(' ')}`.toLowerCase().includes(q)) return false
      if (filter.kind === 'togo') return toGo.has(place.id)
      if (filter.kind === 'friends') return friendIds.has(place.id)
      if (filter.kind === 'open') return isPlaceOpen(place, night)
      if (filter.kind === 'hood') return place.neighborhood === filter.name
      if (filter.kind === 'guide') return place.guideSlugs.includes(filter.slug)
      return toGo.has(place.id) || friendIds.has(place.id) || isPlaceOpen(place, night)
    }
    const rows = places.filter(matches)
    if (filter.kind === 'mix' && !q) {
      rows.sort((a, b) => Number(toGo.has(b.id)) - Number(toGo.has(a.id)) || Number(friendIds.has(b.id)) - Number(friendIds.has(a.id)))
    }
    return rows.slice(0, 18)
  }, [places, query, filter, toGo, date, time, app])

  function toggle(id: string) {
    if (picked.includes(id)) {
      setFull(false)
      setPicked(picked.filter((item) => item !== id))
      return
    }
    if (picked.length >= 3) {
      setFull(true)
      return
    }
    setFull(false)
    setPicked([...picked, id])
  }

  function move(index: number, direction: -1 | 1) {
    setPicked((current) => {
      const next = current.slice()
      const target = index + direction
      if (target < 0 || target >= next.length) return current
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
  }

  function swipeStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    const startY = event.clientY
    const panel = event.currentTarget.closest('.plan-sheet') as HTMLElement | null
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const movePointer = (ev: PointerEvent) => {
      const dy = Math.max(0, ev.clientY - startY)
      if (panel && !reduce) panel.style.transform = `translateY(${dy}px)`
    }
    const end = (ev: PointerEvent) => {
      if (panel) panel.style.transform = ''
      if (ev.clientY - startY > 80) onClose()
      window.removeEventListener('pointermove', movePointer)
      window.removeEventListener('pointerup', end)
    }
    window.addEventListener('pointermove', movePointer)
    window.addEventListener('pointerup', end)
  }

  if (!open) return null

  const empty = filter.kind === 'togo'
    ? 'Nothing in To go yet. Search the list, or try a neighborhood.'
    : filter.kind === 'friends'
      ? 'No friend picks on this list yet.'
      : filter.kind === 'open'
        ? 'Nothing on the list is open then. Try a later time.'
        : 'Nothing matches. Clear the search or pick another chip.'

  return (
    <>
      <Modal onClose={onClose} label="New plan" className="plan-sheet">
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            if (!app.user || !title.trim() || picked.length === 0) return
            const id = app.createPlan(title, picked, [date], { time, inviteIds: invited })
            if (!id) return
            onClose()
            navigate(cityPath(`/plan/${id}`))
          }}
        >
          <div className="sheet-grab" onPointerDown={swipeStart}>
            <span />
          </div>
          <div className="flex items-start justify-between gap-3 px-4">
            <h2 className="font-serif text-4xl italic">New plan</h2>
            <button type="button" className="sheet-close" onClick={onClose}>Close</button>
          </div>
          <div className="plan-sheet-body min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <label className="field mt-3">
              <span>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <div className="plan-when mt-3">
              <label className="field">
                <span>Date</span>
                <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              </label>
              <label className="field">
                <span>Time</span>
                <input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
              </label>
            </div>
            {picked.length ? (
              <ul className="plan-tray mt-4" aria-label="Selected places">
                {picked.map((id, index) => {
                  const place = catalog.places.find((item) => item.id === id)
                  if (!place) return null
                  return (
                    <li key={id} className="plan-tray-item">
                      <span className="plan-tray-shot">
                        <PlaceThumb place={place} uploads={app.photos} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{place.name}</span>
                        <span className="block truncate text-xs">{place.neighborhood}</span>
                      </span>
                      <button type="button" className="sheet-icon" aria-label={`Move ${place.name} up`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
                      <button type="button" className="sheet-icon" aria-label={`Move ${place.name} down`} disabled={index === picked.length - 1} onClick={() => move(index, 1)}>↓</button>
                      <button type="button" className="sheet-icon" aria-label={`Remove ${place.name}`} onClick={() => toggle(id)}>×</button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm">Pick up to three places. They sit here so you can reorder them.</p>
            )}
            {full ? <p className="mt-2 text-sm">Three is the table. Remove one to swap it.</p> : null}
            <label className="field mt-4">
              <span>Search</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pizza, Ballard, Canlis" />
            </label>
            <SlidingRow label="Suggestions" className="mt-3">
              <button type="button" className="chip" aria-pressed={filter.kind === 'mix'} onClick={() => setFilter({ kind: 'mix' })}>Suggested</button>
              <button type="button" className="chip" aria-pressed={filter.kind === 'togo'} onClick={() => setFilter({ kind: 'togo' })}>To go</button>
              <button type="button" className="chip" aria-pressed={filter.kind === 'friends'} onClick={() => setFilter({ kind: 'friends' })}>Friends' picks</button>
              <button type="button" className="chip" aria-pressed={filter.kind === 'open'} onClick={() => setFilter({ kind: 'open' })}>Open that night</button>
              {hoods.map((name) => (
                <button key={name} type="button" className="chip" aria-pressed={filter.kind === 'hood' && filter.name === name} onClick={() => setFilter({ kind: 'hood', name })}>{name}</button>
              ))}
              {guides.map((guide) => (
                <button key={guide.slug} type="button" className="chip" aria-pressed={filter.kind === 'guide' && filter.slug === guide.slug} onClick={() => setFilter({ kind: 'guide', slug: guide.slug, title: guide.title })}>{guide.title}</button>
              ))}
            </SlidingRow>
            {demoFriendsEnabled && filter.kind === 'friends' && !app.supabase ? <p className="mt-2 text-sm">Seeded friends, dev only. Places they have been.</p> : null}
            <ul className="mt-3 space-y-2">
              {results.map((place) => {
                const on = picked.includes(place.id)
                return (
                  <li key={place.id}>
                    <button
                      type="button"
                      className={`plan-pick place-row has-action ${on ? 'is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggle(place.id)}
                    >
                      <span className="place-row-shot" style={reduceMotion ? undefined : { viewTransitionName: `place-${place.id}` }}>
                        <PlaceThumb place={place} uploads={app.photos} sizes="64px" />
                      </span>
                      <span className="place-row-copy">
                        <span className="block truncate font-serif text-2xl italic leading-tight">{place.name}</span>
                        <span className="mt-1 block truncate text-sm">{place.neighborhood} · {cuisineLabel(place.cuisine[0] ?? '')}</span>
                      </span>
                      <span className="score-col"><ScoreBadge score={app.gustoScore(place.id)} size="sm" /></span>
                      <span className={`pick-check ${on ? 'is-on' : ''}`} aria-hidden="true">✓</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {results.length === 0 ? <p className="mt-3 text-sm">{empty}</p> : null}
            <h3 className="mt-5 font-serif text-2xl italic">Who's coming</h3>
            {roster.length === 0 ? (
              <div className="mt-2">
                <FriendEmpty onSignIn={() => setSignIn(true)} title="No friends yet" line="Add a username or email an invite. The plan can still go out with just you." />
              </div>
            ) : null}
            <ul className="invite-row mt-2">
              {roster.map((person, index) => {
                const on = invited.includes(person.id)
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      className={`invite-person ${on ? 'is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => setInvited((current) => current.includes(person.id) ? current.filter((id) => id !== person.id) : [...current, person.id])}
                    >
                      <span className="avatar" style={{ background: AVATAR[index % AVATAR.length], color: AVATAR[index % AVATAR.length] === '#141f4d' ? '#fffaf3' : '#181818' }}>{initials(person.name)}</span>
                      <span className="truncate text-sm font-bold">{person.name.split(' ')[0]}</span>
                      {demoFriendsEnabled && person.demo ? <span className="text-[0.65rem] font-bold uppercase">Seeded</span> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="plan-sheet-foot">
            {!app.user ? <p className="mb-2 text-sm">Sign in to host. The picks stay on this sheet.</p> : null}
            {app.user ? (
              <button className="btn btn-coral w-full" type="submit" disabled={!title.trim() || picked.length === 0}>Create plan</button>
            ) : (
              <button className="btn btn-coral w-full" type="button" onClick={() => setSignIn(true)}>Sign in to create</button>
            )}
          </div>
        </form>
      </Modal>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </>
  )
}

export function PlanCard({ planId }: { planId: string }) {
  const app = useApp()
  const reduceMotion = useReducedMotion()
  const plan = app.plans.find((item) => item.id === planId)
  if (!plan) return null
  const places = plan.placeIds.map((id) => catalog.places.find((place) => place.id === id)).filter((place): place is SlimPlace => place != null)
  const when = plan.dates[0]
  return (
    <Link to={`/plan/${plan.id}`} className="plan-card" viewTransition={!reduceMotion}>
      <span className="plan-card-shots" aria-hidden="true">
        {places.slice(0, 3).map((place) => (
          <span key={place.id} className="plan-card-shot">
            <PlaceThumb place={place} uploads={app.photos} />
          </span>
        ))}
      </span>
      <span className="min-w-0">
        <span className="block font-serif text-2xl italic leading-none">{plan.title}</span>
        <span className="mt-1 block text-sm">{[when ? prettyDate(when) : '', demoFriendsEnabled && plan.demo ? 'Seeded' : '', plan.locked ? 'Locked in' : ''].filter(Boolean).join(' · ')}</span>
        <span className="mt-1 block truncate text-sm">{places.map((place) => place.name).join(' · ')}</span>
      </span>
    </Link>
  )
}
