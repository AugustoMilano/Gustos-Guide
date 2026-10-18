import { Link, useParams } from 'react-router-dom'
import { PlaceThumb } from '../components/PlaceThumb.tsx'
import { ScoreBadge } from '../components/ScoreBadge.tsx'
import { slimById } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

export function ListPage() {
  const { id = '' } = useParams()
  const app = useApp()
  const guide = app.guides.find((item) => item.id === id)
  const title = guide?.title ?? 'List'
  usePageMeta(`${title} · Gusto's Guide`, 'A list on Gusto’s Guide.', './og/og.svg')
  if (!guide) {
    return <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none"><h1 className="font-serif text-5xl italic">That list is not here.</h1></main>
  }
  const isPublic = guide.isPublic !== false
  const allowed = isPublic || guide.ownerId === app.user?.id || (app.user ? guide.collaboratorIds.includes(app.user.id) : false)
  if (!allowed) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">This list is private.</h1>
        <p className="mt-3">Sign in as the owner, or open an invite, on this browser.</p>
      </main>
    )
  }
  const cover = slimById(guide.coverPlaceId ?? guide.placeIds[0] ?? '')
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <p className="text-xs font-bold uppercase tracking-wide">{guide.demo ? 'Demo list' : isPublic ? 'Public list' : 'Private list'}</p>
      <h1 className="font-serif text-5xl italic">{guide.title}</h1>
      {guide.shared ? <p className="mt-2 text-sm">Collaborative. Edits stay in this browser.</p> : null}
      {cover ? (
        <div className="mt-4 h-48 overflow-hidden border-2 border-ink bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
          <PlaceThumb place={cover} uploads={app.photos} eager />
        </div>
      ) : null}
      <ol className="mt-6 space-y-3">
        {guide.placeIds.map((placeId, index) => {
          const place = slimById(placeId)
          if (!place) return null
          return (
            <li key={placeId}>
              <Link to={`/place/${placeId}`} className="flex items-center gap-3">
                <span className="font-bold">{index + 1}</span>
                <span className="h-16 w-20 shrink-0 overflow-hidden border-2 border-ink bg-navy [&_.place-art]:aspect-auto [&_.place-art]:h-full">
                  <PlaceThumb place={place} uploads={app.photos} />
                </span>
                <span>
                  <ScoreBadge score={app.gustoScore(place.id)} size="sm" />
                  <span className="mt-1 block font-serif text-2xl italic leading-none">{place.name}</span>
                  <span className="text-sm">{place.neighborhood}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </main>
  )
}
