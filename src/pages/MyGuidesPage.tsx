import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { catalog, slimById } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'
import type { UserGuide } from '../types.ts'

export function MyGuidesPage() {
  const app = useApp()
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState('')
  usePageMeta("My guides · Gusto's Guide", 'Lists you make, plus shared demo lists.', './og/og.svg')
  const mine = app.guides.filter((guide) => !guide.demo)
  const shared = app.guides.filter((guide) => guide.demo)
  const matches = catalog.places.filter((place) => query && place.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)

  async function copyLink(guide: UserGuide) {
    const link = app.inviteLink('guide', guide.id)
    await navigator.clipboard.writeText(link)
    setCopied(guide.id)
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <h1 className="font-serif text-5xl italic">My guides</h1>
      <p className="mt-2">House guides stay read-only. These lists live in this browser. Drag a row, or use the buttons, to reorder.</p>
      {app.user ? (
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); app.createGuide(title); setTitle('') }}>
          <label className="sr-only" htmlFor="new-list">New list title</label>
          <input id="new-list" className="min-h-11 flex-1 border-2 border-ink bg-cream px-3" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New list" />
          <button className="btn btn-coral" type="submit">Create</button>
        </form>
      ) : <p className="mt-4">Sign in to make a list.</p>}
      {mine.map((guide) => (
        <GuideEditor
          key={guide.id}
          guide={guide}
          query={query}
          setQuery={setQuery}
          matches={matches}
          copied={copied === guide.id}
          onCopy={() => void copyLink(guide)}
        />
      ))}
      <h2 className="mt-10 font-serif text-4xl italic">Shared</h2>
      <ul className="mt-3 space-y-3">
        {shared.map((guide) => (
          <li key={guide.id} className="border-2 border-ink p-3">
            <Link className="font-serif text-2xl italic" to={`/list/${guide.id}`}>{guide.title}</Link>
            <p className="text-sm">{guide.shared ? 'Collaborative · Demo' : 'Demo'} · {guide.placeIds.length} places · {guide.isPublic === false ? 'Private' : 'Public'}</p>
          </li>
        ))}
      </ul>
    </main>
  )
}

function GuideEditor({
  guide,
  query,
  setQuery,
  matches,
  copied,
  onCopy,
}: {
  guide: UserGuide
  query: string
  setQuery: (value: string) => void
  matches: { id: string; name: string }[]
  copied: boolean
  onCopy: () => void
}) {
  const app = useApp()
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const cover = slimById(guide.coverPlaceId ?? guide.placeIds[0] ?? '')
  const mina = guide.collaboratorIds.includes('demo-mina')
  const isPublic = guide.isPublic !== false

  function dropAt(index: number) {
    if (dragFrom === null || dragFrom === index) return
    const placeIds = guide.placeIds.slice()
    const [item] = placeIds.splice(dragFrom, 1)
    placeIds.splice(index, 0, item)
    app.reorderGuide(guide.id, placeIds)
    setDragFrom(null)
  }

  return (
    <section className="mt-6 border-2 border-ink p-4">
      <div className="flex gap-3">
        {cover ? (
          <span className="h-20 w-24 shrink-0 overflow-hidden border-2 border-ink bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
            <PlaceThumb place={cover} uploads={app.photos} />
          </span>
        ) : null}
        <div>
          <h2 className="font-serif text-3xl italic">{guide.title}</h2>
          <p className="text-sm"><Link className="font-bold" to={`/list/${guide.id}`}>Open list</Link> · {isPublic ? 'Public' : 'Private'}</p>
          {mina ? <p className="text-sm">Mina can edit · Demo. Changes stay in this browser.</p> : null}
        </div>
      </div>
      <div className="share-card mt-3 border-2 border-ink bg-[#fffaf3] p-3">
        <p className="text-xs font-bold uppercase tracking-wide">Share card</p>
        <p className="font-serif text-2xl italic">{guide.title}</p>
        <p className="text-sm">{guide.placeIds.length} places · {isPublic ? 'Anyone with the link on this browser' : 'Private until you toggle it'}</p>
        <button type="button" className="btn mt-2 text-sm" onClick={onCopy}>{copied ? 'Copied' : 'Copy share link'}</button>
        <p className="mt-2 text-sm">This link opens the list on this browser.</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn text-sm" onClick={() => app.shareGuide(guide.id, 'demo-mina')}>Share with Mina · Demo</button>
        <button type="button" className="btn text-sm" aria-pressed={isPublic} onClick={() => app.setGuidePublic(guide.id, !isPublic)}>
          {isPublic ? 'Make private' : 'Make public'}
        </button>
        <button type="button" className="btn text-sm" onClick={() => app.deleteGuide(guide.id)}>Delete</button>
      </div>
      {guide.placeIds.length ? (
        <label className="field mt-3">
          <span>Cover image</span>
          <select value={guide.coverPlaceId ?? guide.placeIds[0]} onChange={(event) => app.setGuideCover(guide.id, event.target.value)}>
            {guide.placeIds.map((id) => {
              const place = slimById(id)
              return <option key={id} value={id}>{place?.name ?? id}</option>
            })}
          </select>
        </label>
      ) : null}
      <ul className="mt-3 space-y-2">
        {guide.placeIds.map((id, index) => {
          const place = slimById(id)
          if (!place) return null
          return (
            <li
              key={id}
              draggable
              onDragStart={() => setDragFrom(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropAt(index)}
              className="flex items-center justify-between gap-2 border border-ink/30 bg-cream px-2 py-1"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="cursor-grab font-bold">⠿</span>
                <Link to={`/place/${id}`}>{place.name}</Link>
              </span>
              <span className="flex shrink-0 gap-1">
                <button type="button" className="btn text-sm" aria-label={`Move ${place.name} up`} disabled={index === 0} onClick={() => app.moveInGuide(guide.id, id, -1)}>Up</button>
                <button type="button" className="btn text-sm" aria-label={`Move ${place.name} down`} disabled={index === guide.placeIds.length - 1} onClick={() => app.moveInGuide(guide.id, id, 1)}>Down</button>
                <button type="button" className="btn text-sm" onClick={() => app.removeFromGuide(guide.id, id)}>Remove</button>
              </span>
            </li>
          )
        })}
      </ul>
      <label className="field mt-3">
        <span>Add a place</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <ul>
        {matches.map((place) => (
          <li key={place.id}><button type="button" className="text-sm font-bold" onClick={() => app.addToGuide(guide.id, place.id)}>Add {place.name}</button></li>
        ))}
      </ul>
    </section>
  )
}
