import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ListShareCard } from '../components/ListShareCard.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { GoldenFork } from '../components/GoldenFork.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { StoryShareButton } from '../components/StoryShareButton.tsx'
import { SlidingRow } from '../components/SlidingRow.tsx'
import { slimById } from '../content/load.ts'
import { demoFriendsEnabled } from '../lib/demo.ts'
import { milesBetween, priceLabel } from '../lib/format.ts'
import { readPosition } from '../lib/geo.ts'
import { isOpen } from '../lib/hours.ts'
import { listColor, listOgSvg } from '../lib/lists.ts'
import { renderGuideStory } from '../lib/story-card.ts'
import { awardFor } from '../lib/top25.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { Price, SlimPlace } from '../types.ts'

type SortKey = 'order' | 'score' | 'recent' | 'neighborhood' | 'distance'

export function ListPage() {
  const { id = '' } = useParams()
  const app = useApp()
  const guide = app.guides.find((item) => item.id === id)
  const title = guide?.title ?? 'List'
  const [sort, setSort] = useState<SortKey>('order')
  const [openNow, setOpenNow] = useState(false)
  const [prices, setPrices] = useState<Price[]>([])
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [whereError, setWhereError] = useState('')
  const [copied, setCopied] = useState(false)
  const detail = guide ? `${guide.placeIds.length} places on this list` : 'A list on Gusto’s Guide.'
  usePageMeta(
    `${title} · Gusto's Guide`,
    detail,
    guide ? listOgSvg(guide.title, detail, guide.emoji ?? '🍽', listColor(guide.color)) : './og/og.svg',
  )

  const rows = useMemo(() => {
    if (!guide) return []
    const places = guide.placeIds
      .map((placeId, index) => {
        const place = slimById(placeId)
        if (!place) return null
        return { place, index, note: guide.notes?.[placeId] ?? '' }
      })
      .filter((row): row is { place: SlimPlace; index: number; note: string } => row != null)
    const filtered = places.filter((row) => {
      if (openNow && !isOpen(row.place.periods)) return false
      if (prices.length && (row.place.price == null || !prices.includes(row.place.price))) return false
      return true
    })
    const scored = filtered.slice()
    if (sort === 'score') {
      scored.sort((a, b) => (app.gustoScore(b.place.id) ?? -1) - (app.gustoScore(a.place.id) ?? -1))
    } else if (sort === 'recent') {
      scored.sort((a, b) => (guide.addedAt?.[b.place.id] ?? '').localeCompare(guide.addedAt?.[a.place.id] ?? ''))
    } else if (sort === 'neighborhood') {
      scored.sort((a, b) => a.place.neighborhood.localeCompare(b.place.neighborhood) || a.index - b.index)
    } else if (sort === 'distance' && origin) {
      scored.sort((a, b) => milesBetween(origin, a.place) - milesBetween(origin, b.place))
    } else {
      scored.sort((a, b) => a.index - b.index)
    }
    return scored
  }, [guide, openNow, prices, sort, origin, app])

  if (!guide) {
    return <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none"><h1 className="font-serif text-5xl italic">That list is not here.</h1></main>
  }
  const visibility = guide.visibility ?? (guide.isPublic === false ? 'private' : 'public')
  const owner = Boolean(app.user && guide.ownerId === app.user.id)
  const collab = Boolean(app.user && guide.collaboratorIds.includes(app.user.id))
  const allowed = visibility === 'public' || owner || collab || (demoFriendsEnabled && guide.demo) || (!app.supabase && owner)
  if (!allowed) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">This list is private.</h1>
        <p className="mt-3">Sign in as the owner, or open an invite, on this browser.</p>
      </main>
    )
  }

  const cover = slimById(guide.coverPlaceId ?? guide.placeIds[0] ?? '')

  function togglePrice(price: Price) {
    setPrices((current) => current.includes(price) ? current.filter((item) => item !== price) : [...current, price])
  }

  async function sortByDistance() {
    setWhereError('')
    try {
      const next = origin ?? await readPosition()
      setOrigin(next)
      setSort('distance')
    } catch (reason) {
      setWhereError(reason instanceof Error ? reason.message : 'Location is off.')
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(app.inviteLink('guide', guide!.id))
    setCopied(true)
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <p className="text-xs font-bold uppercase tracking-wide">{demoFriendsEnabled && guide.demo ? 'Seeded list' : visibility === 'public' ? 'Public list' : visibility === 'friends' ? 'Friends list' : 'Private list'} · {rows.length === guide.placeIds.length ? `${guide.placeIds.length} places` : `${rows.length} of ${guide.placeIds.length} places`}</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-5xl italic">{guide.emoji ? `${guide.emoji} ` : ''}{guide.title}</h1>
        <StoryShareButton
          filename={`${guide.id}-story.png`}
          title={guide.title}
          build={() => renderGuideStory({
            title: guide.title,
            items: guide.placeIds.flatMap((placeId) => {
              const place = slimById(placeId)
              if (!place) return []
              const award = awardFor(place.id, app.gustoScore)
              return [{ name: place.name, neighborhood: place.neighborhood, score: app.gustoScore(place.id), metal: award?.metal ?? null }]
            }),
          })}
        />
      </div>
      {guide.collaboratorIds.length ? <p className="mt-2 text-sm">{app.supabase ? 'Collaborative.' : 'Collaborative. Edits stay in this browser.'}</p> : null}
      <div className="mt-4">
        <ListShareCard guide={guide} cover={cover} uploads={app.photos} copied={copied} onCopy={() => void copyLink()} />
      </div>
      <div className="mt-4">
        <SlidingRow label="Sort this list">
          <button type="button" className="chip" aria-pressed={sort === 'order'} onClick={() => setSort('order')}>Your order</button>
          <button type="button" className="chip" aria-pressed={sort === 'score'} onClick={() => setSort('score')}>Score</button>
          <button type="button" className="chip" aria-pressed={sort === 'recent'} onClick={() => setSort('recent')}>Recently added</button>
          <button type="button" className="chip" aria-pressed={sort === 'neighborhood'} onClick={() => setSort('neighborhood')}>Neighborhood</button>
          <button type="button" className="chip" aria-pressed={sort === 'distance'} onClick={() => void sortByDistance()}>Distance</button>
        </SlidingRow>
      </div>
      <div className="mt-2">
        <SlidingRow label="Filter this list">
          <button type="button" className="chip" aria-pressed={openNow} onClick={() => setOpenNow((value) => !value)}>Open now</button>
          {([1, 2, 3, 4] as Price[]).map((price) => (
            <button key={price} type="button" className="chip" aria-pressed={prices.includes(price)} onClick={() => togglePrice(price)}>{priceLabel(price)}</button>
          ))}
        </SlidingRow>
      </div>
      {whereError ? <p className="mt-2 text-sm">{whereError}</p> : null}
      {rows.length === 0 ? <p className="mt-6">Nothing in this list matches. Clear a filter, or add a place from My guides.</p> : null}
      <ol className="mt-6 space-y-3">
        {rows.map(({ place, note }, index) => {
          const editable = (owner || collab) && sort === 'order'
          const at = guide.placeIds.indexOf(place.id)
          return (
            <li key={place.id} className="list-row">
              <Link to={`/place/${place.id}`} className="plan-pick min-w-0 flex-1">
                <span className="plan-pick-shot"><PlaceThumb place={place} uploads={app.photos} sizes="72px" /></span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex flex-wrap items-center gap-2"><ScoreBadge score={app.gustoScore(place.id)} size="sm" /><GoldenFork placeId={place.id} /></span>
                  <span className="mt-1 block font-serif text-2xl italic leading-none">{index + 1}. {place.name}</span>
                  <span className="mt-1 block text-sm">{place.neighborhood} · {priceLabel(place.price)}</span>
                  {note ? <span className="mt-1 block text-sm italic">{note}</span> : null}
                </span>
              </Link>
              {editable ? (
                <span className="list-row-actions">
                  <button type="button" className="sheet-icon" aria-label={`Move ${place.name} up`} disabled={at <= 0} onClick={() => app.moveInGuide(guide.id, place.id, -1)}>↑</button>
                  <button type="button" className="sheet-icon" aria-label={`Move ${place.name} down`} disabled={at < 0 || at >= guide.placeIds.length - 1} onClick={() => app.moveInGuide(guide.id, place.id, 1)}>↓</button>
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </main>
  )
}
