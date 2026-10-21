import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaKicker } from '../components/AreaKicker.tsx'
import { ListShareCard } from '../components/ListShareCard.tsx'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { slimById } from '../content/load.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import { LIST_COLORS, LIST_EMOJI } from '../lib/lists.ts'
import { demoFriendsEnabled } from '../lib/demo.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { UserGuide } from '../types.ts'

export function MyGuidesPage() {
  const app = useApp()
  const [title, setTitle] = useState('')
  const [copied, setCopied] = useState('')
  const [signIn, setSignIn] = useState(false)
  usePageMeta("My guides · Gusto's Guide", 'Lists on your account.', './og/og.svg')
  const mine = app.guides.filter((guide) => !guide.demo && (!app.supabase || !guide.ownerId || guide.ownerId === app.user?.id))
  const shared = app.supabase
    ? app.guides.filter((guide) => guide.ownerId && guide.ownerId !== app.user?.id)
    : app.guides.filter((guide) => guide.demo)
  async function copyLink(guide: UserGuide) {
    const link = app.inviteLink('guide', guide.id)
    await navigator.clipboard.writeText(link)
    setCopied(guide.id)
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <AreaKicker />
      <h1 className="mt-2 font-serif text-5xl italic">My guides</h1>
      <p className="mt-2">{app.supabase ? 'House guides stay read-only. These lists live on your account. Drag a row, or use the buttons, to reorder.' : 'House guides stay read-only. These lists live in this browser. Drag a row, or use the buttons, to reorder.'}</p>
      {app.user ? (
        <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); app.createGuide(title); setTitle('') }}>
          <label className="sr-only" htmlFor="new-list">New list title</label>
          <input id="new-list" className="min-h-11 min-w-0 flex-1 basis-40 border-2 border-ink bg-cream px-3" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New list" />
          <button className="btn btn-coral" type="submit">Create</button>
        </form>
      ) : (
        <div className="mt-4">
          <p>{app.supabase ? 'Sign in to make a list. It stays on your account.' : 'Sign in to make a list. It stays in this browser.'}</p>
          <button type="button" className="btn btn-coral mt-3" onClick={() => setSignIn(true)}>Sign in</button>
        </div>
      )}
      {app.user && mine.length === 0 ? <p className="mt-4">No lists yet.</p> : null}
      {mine.map((guide) => (
        <GuideEditor
          key={guide.id}
          guide={guide}
          copied={copied === guide.id}
          onCopy={() => void copyLink(guide)}
        />
      ))}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
      <h2 className="mt-10 font-serif text-4xl italic">Shared</h2>
      {shared.length === 0 ? <p className="mt-2 text-sm">No shared lists yet. Add a collaborator from a list you made.</p> : null}
      <ul className="mt-3 space-y-3">
        {shared.map((guide) => (
          <li key={guide.id} className="border-2 border-ink p-3">
            <Link className="font-serif text-2xl italic" to={`/list/${guide.id}`}>{guide.title}</Link>
            <p className="text-sm">{[demoFriendsEnabled && guide.demo ? 'Seeded' : '', `${guide.placeIds.length} places`, guide.isPublic === false ? 'Private' : 'Public'].filter(Boolean).join(' · ')}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}

function GuideEditor({
  guide,
  copied,
  onCopy,
}: {
  guide: UserGuide
  copied: boolean
  onCopy: () => void
}) {
  const app = useApp()
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [title, setTitle] = useState(guide.title)
  const cover = slimById(guide.coverPlaceId ?? guide.placeIds[0] ?? '')
  const [friendHandle, setFriendHandle] = useState('')
  const [shareError, setShareError] = useState('')
  const visibility = guide.visibility ?? (guide.isPublic === false ? 'private' : 'public')
  const { places } = useCityCatalog()
  const matches = places.filter((place) => query && place.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)

  function dropAt(index: number) {
    if (dragFrom === null || dragFrom === index) return
    const placeIds = guide.placeIds.slice()
    const [item] = placeIds.splice(dragFrom, 1)
    placeIds.splice(index, 0, item)
    app.reorderGuide(guide.id, placeIds)
    setDragFrom(null)
  }

  return (
    <section className="feed-card mt-6">
      <div className="flex gap-3">
        {cover ? (
          <span className="h-20 w-24 shrink-0 overflow-hidden border-2 border-ink bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
            <PlaceThumb place={cover} uploads={app.photos} sizes="96px" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <label className="field">
            <span>Name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => title.trim() && title !== guide.title && app.renameGuide(guide.id, title.trim())}
            />
          </label>
          <p className="mt-1 text-sm"><Link className="font-bold" to={`/list/${guide.id}`}>Open list</Link> · {guide.placeIds.length} {guide.placeIds.length === 1 ? 'place' : 'places'} · {visibility === 'public' ? 'Public' : visibility === 'friends' ? 'Friends' : 'Private'}</p>
          {demoFriendsEnabled && !app.supabase && guide.collaboratorIds.includes('demo-mina') ? <p className="text-sm">Mina can edit. This seeded collaborator stays in this browser.</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="List emoji">
        {LIST_EMOJI.map((emoji) => (
          <button key={emoji} type="button" className="sheet-icon text-lg" aria-pressed={guide.emoji === emoji} aria-label={`Emoji ${emoji}`} onClick={() => app.setGuideLook(guide.id, { emoji: guide.emoji === emoji ? '' : emoji })}>{emoji}</button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="List color">
        {LIST_COLORS.map((color) => (
          <button key={color.id} type="button" className="swatch" style={{ background: color.value }} aria-pressed={guide.color === color.id} aria-label={color.label} onClick={() => app.setGuideLook(guide.id, { color: color.id })} />
        ))}
      </div>
      <div className="mt-3">
        <ListShareCard guide={{ ...guide, title: title.trim() || guide.title }} cover={cover} uploads={app.photos} copied={copied} onCopy={onCopy} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {app.supabase ? (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setShareError('')
              void app.shareGuideByHandle(guide.id, friendHandle).then(() => setFriendHandle('')).catch((reason: unknown) => setShareError(reason instanceof Error ? reason.message : 'Could not share.'))
            }}
          >
            <label className="sr-only" htmlFor={`collab-${guide.id}`}>Collaborator username</label>
            <input id={`collab-${guide.id}`} className="min-h-11 border-2 border-ink bg-cream px-2" value={friendHandle} onChange={(event) => setFriendHandle(event.target.value)} placeholder="Username" />
            <button type="submit" className="btn text-sm">Add collaborator</button>
          </form>
        ) : demoFriendsEnabled ? (
          <button type="button" className="btn text-sm" onClick={() => app.shareGuide(guide.id, 'demo-mina')}>Share with Mina</button>
        ) : null}
        <label className="field min-w-40">
          <span className="sr-only">Who can see this</span>
          <select value={visibility} onChange={(event) => app.setGuideVisibility(guide.id, event.target.value as 'private' | 'friends' | 'public')}>
            <option value="private">Private</option>
            <option value="friends">Friends</option>
            <option value="public">Public</option>
          </select>
        </label>
        <button type="button" className="btn text-sm" onClick={() => app.deleteGuide(guide.id)}>Delete</button>
      </div>
      {shareError ? <p className="mt-2 text-sm">{shareError}</p> : null}
      {guide.placeIds.length ? (
        <div className="mt-3">
          <p className="text-sm font-bold">Cover photo</p>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {guide.placeIds.map((id) => {
              const place = slimById(id)
              if (!place) return null
              const on = (guide.coverPlaceId ?? guide.placeIds[0]) === id
              return (
                <button key={id} type="button" className={`h-16 w-20 shrink-0 overflow-hidden border-2 ${on ? 'border-coral' : 'border-ink'}`} aria-pressed={on} aria-label={`Cover ${place.name}`} onClick={() => app.setGuideCover(guide.id, id)}>
                  <PlaceThumb place={place} uploads={app.photos} sizes="80px" />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <ul className="mt-3 space-y-2">
        {guide.placeIds.map((id, index) => {
          const place = slimById(id)
          if (!place) return null
          return (
            <li
              key={id}
              className="guide-row"
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropAt(index)}
            >
              <button
                type="button"
                className="drag-grip"
                draggable
                aria-label={`Drag to reorder ${place.name}`}
                onDragStart={() => setDragFrom(index)}
              >
                <span aria-hidden="true">⋮⋮</span>
              </button>
              <span className="plan-tray-shot" aria-hidden="true"><PlaceThumb place={place} uploads={app.photos} sizes="72px" /></span>
              <span className="min-w-0">
                <Link className="inline-flex min-h-11 min-w-0 items-center truncate font-bold" to={`/place/${id}`}>{place.name}</Link>
              </span>
              <span className="score-col"><ScoreBadge score={app.gustoScore(place.id)} size="sm" /></span>
              <label className="field row-note">
                <span className="sr-only">Note for {place.name}</span>
                <input
                  defaultValue={guide.notes?.[id] ?? ''}
                  placeholder="A short note"
                  onBlur={(event) => app.setPlaceNote(guide.id, id, event.target.value)}
                />
              </label>
              <span className="guide-row-actions">
                <button type="button" className="sheet-icon" aria-label={`Move ${place.name} up`} disabled={index === 0} onClick={() => app.moveInGuide(guide.id, id, -1)}>↑</button>
                <button type="button" className="sheet-icon" aria-label={`Move ${place.name} down`} disabled={index === guide.placeIds.length - 1} onClick={() => app.moveInGuide(guide.id, id, 1)}>↓</button>
                <button type="button" className="sheet-icon" aria-label={`Remove ${place.name}`} onClick={() => app.removeFromGuide(guide.id, id)}>×</button>
              </span>
            </li>
          )
        })}
      </ul>
      <label className="field mt-3">
        <span>Add a place</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul className="mt-2 space-y-2">
        {matches.map((place) => {
          const full = slimById(place.id)
          if (!full) return null
          return (
            <li key={place.id}>
              <button type="button" className="plan-pick place-row" onClick={() => app.addToGuide(guide.id, place.id)}>
                <span className="place-row-shot"><PlaceThumb place={full} uploads={app.photos} sizes="64px" /></span>
                <span className="place-row-copy">
                  <span className="block truncate font-serif text-2xl italic leading-tight">{full.name}</span>
                  <span className="mt-1 block truncate text-sm">{full.neighborhood}</span>
                  <span className="mt-1 block text-sm font-bold">Add</span>
                </span>
                <span className="score-col"><ScoreBadge score={app.gustoScore(full.id)} size="sm" /></span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
