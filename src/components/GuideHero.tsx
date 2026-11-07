import { useState } from 'react'
import { displayPhotos, type DisplayPhoto, type LivePhoto } from '../lib/gallery.ts'
import type { SlimPlace } from '../types.ts'

function motif(cuisine: string) {
  const key = cuisine.toLowerCase()
  if (key.includes('pizza')) return 'pizza'
  if (key.includes('coffee') || key.includes('bakery')) return 'cup'
  if (key.includes('sushi') || key.includes('seafood') || key.includes('oyster')) return 'fish'
  if (key.includes('cocktail') || key.includes('wine') || key.includes('beer')) return 'glass'
  return 'plate'
}

function CuisineMark({ cuisine }: { cuisine: string }) {
  const kind = motif(cuisine)
  return (
    <svg viewBox="0 0 1200 640" className="h-64 w-full sm:h-80" role="img" aria-label={`Illustration for ${cuisine}`}>
      <rect width="1200" height="640" fill="#141F4D" />
      <circle cx="180" cy="120" r="180" fill="#FF5330" />
      <circle cx="1040" cy="520" r="220" fill="#38BA46" opacity="0.85" />
      <circle cx="860" cy="80" r="70" fill="#F2C14E" />
      {kind === 'pizza' ? (
        <g>
          <circle cx="620" cy="340" r="150" fill="#EEE3D6" stroke="#181818" strokeWidth="8" />
          <circle cx="620" cy="340" r="112" fill="#FF5330" />
          <path d="M620 230 L620 450 M510 340 L730 340" stroke="#EEE3D6" strokeWidth="8" />
        </g>
      ) : null}
      {kind === 'cup' ? (
        <g fill="none" stroke="#EEE3D6" strokeWidth="10">
          <path d="M500 250 h180 v90 a90 90 0 0 1-180 0z" />
          <path d="M680 290 h40 a40 40 0 0 1 0 70 h-40" />
          <path d="M540 210 q20-30 10-50 M600 200 q16-28 8-48 M650 214 q18-26 6-46" />
        </g>
      ) : null}
      {kind === 'fish' ? (
        <g fill="#EEE3D6">
          <ellipse cx="620" cy="340" rx="170" ry="70" />
          <polygon points="790,340 900,270 900,410" />
          <circle cx="520" cy="330" r="10" fill="#141F4D" />
        </g>
      ) : null}
      {kind === 'glass' ? (
        <g fill="none" stroke="#EEE3D6" strokeWidth="10">
          <path d="M540 220 h160 l-30 150 h-100z" />
          <path d="M620 370 v70 M570 450 h100" />
        </g>
      ) : null}
      {kind === 'plate' ? (
        <g fill="none" stroke="#EEE3D6" strokeWidth="10">
          <ellipse cx="620" cy="360" rx="190" ry="70" />
          <ellipse cx="620" cy="360" rx="120" ry="40" />
          <path d="M560 300 q60-70 120 0" />
        </g>
      ) : null}
      <text x="72" y="560" fill="#EEE3D6" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif" fontSize="28" fontWeight="650">
        {cuisine}
      </text>
    </svg>
  )
}

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
        <CuisineMark cuisine={places[0]?.cuisine[0] ?? 'Seattle'} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
        <p className="area-kicker text-white">{area}</p>
        <h1 className="mt-1 max-w-4xl font-serif text-4xl italic leading-none text-white sm:text-6xl">{title}</h1>
      </div>
    </div>
  )
}
