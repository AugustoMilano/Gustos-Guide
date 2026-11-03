import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Modal } from './Modal.tsx'
import { Medal3D } from './Medal3D.tsx'
import { catalogReady, loadGuides, slimById } from '../content/load.ts'
import { achievementArt, computeAchievements, type Achievement, type AchievementGroup } from '../lib/achievements.ts'
import { cityPath } from '../lib/city.ts'
import { supabaseClient } from '../social/supabase.ts'
import type { Guide } from '../types.ts'

type Dates = Record<string, string>

const GROUPS: AchievementGroup[] = ['Ultimate', 'Milestones', 'Cities', 'Guides']
const GUIDE_PREVIEW = 6

const GUIDE_AREAS = [
  { id: 'seattle', title: 'Seattle', cities: ['seattle', 'eastside'] },
  { id: 'la', title: 'Los Angeles', cities: ['la'] },
  { id: 'bay', title: 'SF Bay Area', cities: ['sf', 'eastbay', 'peninsula', 'northbay'] },
  { id: 'sandiego', title: 'San Diego', cities: ['sandiego'] },
]

/** Guide medals by city; the city in the switcher comes first. Earned, then closest to done, then untouched. */
function guideAreas(list: Achievement[], current: string) {
  const groups = GUIDE_AREAS.map((area) => ({ area, rows: list.filter((a) => area.cities.includes(a.guide?.city ?? 'seattle')) }))
  const other = list.filter((a) => !GUIDE_AREAS.some((area) => area.cities.includes(a.guide?.city ?? 'seattle')))
  if (other.length) groups.push({ area: { id: 'other', title: 'Across cities', cities: [] }, rows: other })
  for (const g of groups) g.rows.sort((a, b) => Number(b.earned) - Number(a.earned) || b.have / b.goal - a.have / a.goal)
  const first = groups.findIndex((g) => g.area.cities.includes(current))
  if (first > 0) groups.unshift(...groups.splice(first, 1))
  return groups.filter((g) => g.rows.length)
}

export function formatEarned(iso: string, long = false): string {
  return new Date(iso).toLocaleDateString('en-US', { month: long ? 'long' : 'short', day: 'numeric', year: 'numeric' })
}

function engraveDate(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()} ${d.getDate()}, ${d.getFullYear()}`
}

function localKey(userId: string) {
  return `gg_achievements_${userId}`
}

function readLocal(userId: string): Dates | null {
  try {
    const raw = localStorage.getItem(localKey(userId))
    return raw ? (JSON.parse(raw) as Dates) : null
  } catch {
    return null
  }
}

function writeLocal(userId: string, dates: Dates) {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(dates))
  } catch {
    /* private mode */
  }
}

/**
 * Earned dates: stored the first time a badge is earned and never changed.
 * Signed in with Supabase: user_achievements (own rows only, insert-only). Otherwise this browser.
 */
function useEarnedDates(userId: string | null, earnedIds: string[], ready: boolean) {
  const [dates, setDates] = useState<Dates>({})
  const [fresh, setFresh] = useState<string[]>([])
  const key = earnedIds.join('|')
  useEffect(() => {
    if (!userId || !ready) return
    let cancelled = false
    const run = async () => {
      const remote = supabaseClient()
      const local: Dates = readLocal(userId) ?? {}
      let known: Dates = { ...local }
      let server: Dates | null = null
      if (remote) {
        const { data, error } = await remote.from('user_achievements').select('badge_id, earned_at').eq('user_id', userId)
        // The server's date wins; if it can't be read, this browser's dates still show.
        if (!error) {
          server = Object.fromEntries((data ?? []).map((row: { badge_id: string; earned_at: string }) => [row.badge_id, row.earned_at]))
          known = { ...local, ...server }
        }
      }
      // Celebrate only once there is a record to compare to; a first load just files what was already earned.
      const hadAny = Object.keys(known).length > 0 || readLocal(userId) != null
      const missing = earnedIds.filter((id) => !known[id])
      const now = new Date().toISOString()
      for (const id of missing) known[id] = now
      // Store on the server anything it lacks, keeping a date this browser saw first.
      const toSave = server ? earnedIds.filter((id) => !server[id]) : []
      if (remote && toSave.length) {
        const { error } = await remote
          .from('user_achievements')
          .upsert(toSave.map((badge_id) => ({ user_id: userId, badge_id, earned_at: known[badge_id] })), { onConflict: 'user_id,badge_id', ignoreDuplicates: true })
        if (error) console.warn('Could not save achievement dates', error.message)
      }
      writeLocal(userId, known)
      if (cancelled) return
      setDates({ ...known })
      // Celebrate once. A first-ever load records what was already earned without a show.
      if (missing.length && hadAny) setFresh(missing)
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, key, ready])
  return { dates, fresh, clearFresh: () => setFresh([]) }
}

export function Achievements({ been, rated, userId, gustoScore, mine, city, who }: {
  been: string[]
  rated: string[]
  userId: string | null
  gustoScore: (id: string) => number | null
  mine: boolean
  city: string
  who?: string
}) {
  const [guides, setGuides] = useState<Guide[] | null>(null)
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const [open, setOpen] = useState<{ id: string; celebrate: boolean } | null>(null)
  const [openAreas, setOpenAreas] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let live = true
    void Promise.all([loadGuides(), catalogReady]).then(([list]) => {
      if (!live) return
      setGuides(list)
      setCatalogLoaded(true)
    })
    return () => {
      live = false
    }
  }, [])

  const computed = useMemo(
    () => (guides && catalogLoaded ? computeAchievements({ been, rated, guides, placeOf: slimById, gustoScore }) : []),
    [guides, catalogLoaded, been, rated, gustoScore],
  )
  const computedEarned = computed.filter((a) => a.earned && !a.legacy).map((a) => a.id)
  const { dates, fresh, clearFresh } = useEarnedDates(mine ? userId : null, computedEarned, computed.length > 0)
  // Once earned, always earned (a city can gain guides later). Retired Eastside medals show only if already earned.
  const items = computed
    .map((a) => (!a.earned && dates[a.id] ? { ...a, earned: true, have: a.goal } : a))
    .filter((a) => !a.legacy || Boolean(dates[a.id]))
  const earnedIds = items.filter((a) => a.earned).map((a) => a.id)

  useEffect(() => {
    if (fresh.length && !open) setOpen({ id: fresh.find((id) => id === 'ultimate-all') ?? fresh.find((id) => id.startsWith('ultimate-')) ?? fresh[fresh.length - 1], celebrate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh])

  if (!items.length) {
    return (
      <section className="mt-8" aria-labelledby="achievements" aria-busy="true">
        <h2 id="achievements" className="font-serif text-3xl italic">Achievements</h2>
        <div className="ach-grid mt-3" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton aspect-square rounded-full" />)}
        </div>
      </section>
    )
  }

  const current = open ? items.find((a) => a.id === open.id) : undefined
  const earnedCount = earnedIds.length

  return (
    <section className="mt-8" aria-labelledby="achievements">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="achievements" className="font-serif text-3xl italic">Achievements</h2>
        <p className="text-xs font-bold tracking-[0.14em] uppercase">{earnedCount} of {items.length} earned</p>
      </div>
      {GROUPS.map((group) => {
        const list = items.filter((a) => a.group === group)
        if (group !== 'Guides') {
          return (
            <div key={group} className="mt-6">
              <h3 className="text-xs font-bold tracking-[0.14em] uppercase">{group}</h3>
              {group === 'Ultimate' ? <p className="mt-1 text-sm">Finish a whole city, a whole state, or everything.</p> : null}
              <TileGrid list={list} dates={dates} big={group === 'Ultimate'} onOpen={(id) => setOpen({ id, celebrate: false })} />
            </div>
          )
        }
        return (
          <div key={group} className="mt-8">
            <h3 className="font-serif text-2xl italic">Guides</h3>
            <p className="mt-1 text-sm">Mark every place in a guide Been to earn its medal.</p>
            {guideAreas(list, city).map(({ area, rows }, index) => {
              const earned = rows.filter((a) => a.earned).length
              const expanded = openAreas[area.id] === true
              // The city being browsed opens with a preview; other cities stay folded under their own heading.
              const home = index === 0
              const shown = expanded ? rows : home ? rows.slice(0, GUIDE_PREVIEW) : []
              return (
                <section key={area.id} className="ach-city mt-6" aria-labelledby={`ach-${area.id}`}>
                  <div className="ach-city-head">
                    <h4 id={`ach-${area.id}`} className="text-xs font-bold tracking-[0.14em] uppercase">{area.title}</h4>
                    <p className="text-xs font-bold tabular-nums">{earned} of {rows.length} earned</p>
                  </div>
                  {shown.length ? <TileGrid list={shown} dates={dates} onOpen={(id) => setOpen({ id, celebrate: false })} /> : null}
                  {!home || rows.length > GUIDE_PREVIEW ? (
                    <button type="button" className="btn mt-3" aria-expanded={expanded} aria-controls={`ach-${area.id}`} onClick={() => setOpenAreas((prev) => ({ ...prev, [area.id]: !expanded }))}>
                      {expanded ? `Hide ${area.title} guides` : home ? `Show all ${rows.length} ${area.title} guides` : `Show ${rows.length} ${area.title} guides`}
                    </button>
                  ) : null}
                </section>
              )
            })}
          </div>
        )
      })}
      {current ? (
        <AchievementSheet a={current} who={who} date={dates[current.id]} celebrate={open?.celebrate ?? false} onClose={() => { setOpen(null); if (open?.celebrate) clearFresh() }} />
      ) : null}
    </section>
  )
}

function TileGrid({ list, dates, onOpen, big = false }: { list: Achievement[]; dates: Dates; onOpen: (id: string) => void; big?: boolean }) {
  return (
    <ul className={`ach-grid mt-3 ${big ? 'ach-grid-ultimate' : ''}`}>
      {list.map((a, i) => (
        <li key={a.id} className="stagger-in" style={{ '--i': Math.min(i, 8) } as React.CSSProperties}>
          <button type="button" className="ach-tile" onClick={() => onOpen(a.id)} aria-label={`${a.title}. ${a.earned ? `Earned${dates[a.id] ? ` ${formatEarned(dates[a.id], true)}` : ''}` : `${a.have} of ${a.goal}`}`}>
            <BadgeRing a={a} size={big ? 128 : 96} />
            <span className="ach-name">{a.title}</span>
            <span className="ach-meta">{a.earned ? (dates[a.id] ? formatEarned(dates[a.id]) : 'Earned') : `${a.have}/${a.goal}`}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

const RING: Record<Achievement['ring'], [string, string]> = {
  coral: ['#ff5330', '#ffb199'],
  leaf: ['#16a34a', '#a6f4c5'],
  sky: ['#1d6fe0', '#9cd2ff'],
  gold: ['#c98a00', '#ffd87a'],
}

export function BadgeRing({ a, size, bare = false }: { a: Achievement; size: number; bare?: boolean }) {
  const r = 46
  const c = 2 * Math.PI * r
  const pct = a.earned ? 1 : a.have / a.goal
  const [from, to] = RING[a.ring]
  const gid = `ring-${a.id}`
  return (
    <span className={`ach-badge ${a.earned ? 'is-earned' : 'is-locked'}${a.spec.ultimate ? ' is-ultimate' : ''}`} style={{ width: size, height: size }}>
      <svg className="ach-ring" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} /></linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke={from} strokeOpacity=".14" strokeWidth="5" />
        {pct > 0 ? (
          <circle cx="50" cy="50" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${Math.max(0.02, pct) * c} ${c}`} transform="rotate(-90 50 50)" />
        ) : null}
      </svg>
      {bare ? null : <span className="ach-art" dangerouslySetInnerHTML={{ __html: achievementArt(a) }} />}
    </span>
  )
}

function AchievementSheet({ a, date, celebrate, onClose, who }: { a: Achievement; date?: string; celebrate: boolean; onClose: () => void; who?: string }) {
  const reduce = useReducedMotion()
  return (
    <Modal onClose={onClose} label={a.title}>
      <div className={`ach-sheet ${celebrate ? 'is-celebrating' : ''}`}>
        {celebrate ? <p className="text-xs font-bold tracking-[0.14em] uppercase text-coral">{a.spec.ultimate ? 'Ultimate medal' : 'New achievement'}</p> : null}
        {celebrate && !reduce ? <Confetti count={a.spec.ultimate ? 48 : 22} gold={a.spec.ultimate === true} /> : null}
        <motion.div
          className="ach-hero"
          initial={reduce ? false : { scale: 0.55, rotate: celebrate ? -14 : -4, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: celebrate ? 11 : 18 }}
        >
          <BadgeRing a={a} size={240} bare />
          <span className="ach-hero-medal">
            <Medal3D
              a={a}
              size={192}
              engraved={a.earned
                ? { top: 'Earned', date: date ? engraveDate(date) : undefined, middle: a.title, bottom: who }
                : { top: 'Not yet earned', date: `${a.have} of ${a.goal}`, middle: a.title }}
            />
          </span>
        </motion.div>
        <h2 className="mt-4 text-center font-serif text-4xl italic leading-tight">{a.title}</h2>
        {a.earned ? (
          <p className="ach-date">{date ? `Earned ${formatEarned(date, true)}` : 'Earned'}</p>
        ) : (
          <p className="ach-date ach-date-locked">{a.have} of {a.goal}</p>
        )}
        <p className="mt-2 text-center">{a.blurb}</p>
        {!a.earned ? (
          <div className="ach-bar mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={a.goal} aria-valuenow={a.have}>
            <span style={{ width: `${(a.have / a.goal) * 100}%` }} />
          </div>
        ) : null}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {a.guide ? <Link className="btn btn-coral" to={cityPath(`/guide/${a.guide.slug}`, a.guide.city)} onClick={onClose}>Open the guide</Link> : null}
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  )
}


const CONFETTI = ['#ff5330', '#ffd87a', '#16a34a', '#1d6fe0', '#c79bff', '#ff9ec7']

/** A one-shot burst; transform and opacity only. */
function Confetti({ count, gold = false }: { count: number; gold?: boolean }) {
  return (
    <span className={`confetti${gold ? ' is-gold' : ''}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.2
        const dist = 110 + ((i * 37) % 90)
        const style = {
          '--dx': `${Math.cos(angle) * dist}px`,
          '--dy': `${Math.sin(angle) * dist - 60}px`,
          '--rot': `${(i * 67) % 360}deg`,
          background: CONFETTI[i % CONFETTI.length],
          animationDelay: `${(i % 6) * 18}ms`,
        } as React.CSSProperties
        return <span key={i} className={i % 2 ? 'confetti-bit is-round' : 'confetti-bit'} style={style} />
      })}
    </span>
  )
}
