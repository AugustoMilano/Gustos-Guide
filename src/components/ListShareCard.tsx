import { PlaceThumb } from './PlaceThumb.tsx'
import { listColor } from '../lib/lists.ts'
import type { LivePhoto } from '../state/AppState.tsx'
import type { SlimPlace, UserGuide } from '../types.ts'

export function ListShareCard({
  guide,
  cover,
  uploads,
  copied,
  onCopy,
}: {
  guide: UserGuide
  cover?: SlimPlace
  uploads: LivePhoto[]
  copied: boolean
  onCopy: () => void
}) {
  const visibility = guide.visibility ?? (guide.isPublic === false ? 'private' : 'public')
  const who = visibility === 'public' ? 'Public' : visibility === 'friends' ? 'Friends' : 'Private'
  return (
    <div className="list-og" style={{ ['--list-accent' as string]: listColor(guide.color) }}>
      <div className="list-og-photo">
        {cover ? <PlaceThumb place={cover} uploads={uploads} eager /> : <span className="list-og-mark" aria-hidden="true">{guide.emoji || '🍽'}</span>}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold tracking-[0.14em] uppercase">Share card</p>
        <p className="mt-1 font-serif text-3xl italic leading-none">{guide.emoji ? `${guide.emoji} ` : ''}{guide.title}</p>
        <p className="mt-2 text-sm">{guide.placeIds.length} {guide.placeIds.length === 1 ? 'place' : 'places'} · {who} · Seattle</p>
        <button type="button" className="btn mt-3 text-sm" onClick={onCopy}>{copied ? 'Copied' : 'Copy share link'}</button>
      </div>
    </div>
  )
}
