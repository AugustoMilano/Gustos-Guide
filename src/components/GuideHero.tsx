import { useState } from 'react'
import { PlaceArt } from './PlaceArt.tsx'
import { displayPhotos, type DisplayPhoto, type LivePhoto } from '../lib/gallery.ts'
import type { SlimPlace } from '../types.ts'

export function GuideHero({
  title,
  places,
  uploads,
  area = 'Seattle',
}: {
  title: string
  places: SlimPlace[]
  uploads: LivePhoto[]
  area?: string
}) {
  const [failed, setFailed] = useState<string[]>([])
  function markFailed(url: string | undefined) {
    if (!url) return
    setFailed((current) => (current.includes(url) ? current : [...current, url]))
  }
  const photos: DisplayPhoto[] = []
  for (const place of places) {
    const shot = displayPhotos(place, uploads).find((photo) => photo.url && !photo.illustration && !failed.includes(photo.url))
    if (shot) photos.push(shot)
    if (photos.length === 3) break
  }
  return (
    <div className="guide-hero relative mt-4 overflow-hidden bg-navy text-cream">
      {photos.length >= 2 ? (
        <div className="grid h-64 grid-cols-3 sm:h-80">
          <img src={photos[0].url} alt="" className="col-span-2 h-full w-full object-cover" onError={() => markFailed(photos[0].url)} />
          <div className="grid grid-rows-2">
            <img src={photos[1].url} alt="" className="h-full w-full object-cover" onError={() => markFailed(photos[1].url)} />
            {photos[2] ? <img src={photos[2].url} alt="" className="h-full w-full object-cover" onError={() => markFailed(photos[2].url)} /> : <div className="bg-coral" />}
          </div>
        </div>
      ) : (
        <div className="h-64 sm:h-80 [&_.place-art]:h-full">
          <PlaceArt id={places[0]?.id ?? 'guide'} cuisine={places[0]?.cuisine[0] ?? ''} neighborhood={places[0]?.neighborhood ?? ''} />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <p className="area-kicker text-white">{area}</p>
        <h1 className="mt-1 max-w-4xl font-serif text-4xl italic leading-none text-white sm:text-6xl">{title}</h1>
      </div>
    </div>
  )
}
