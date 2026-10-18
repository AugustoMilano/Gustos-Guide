import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { directionsUrl, formatRating, hostOf, priceLabel, shareUrl } from '../lib/format.ts'
import { useGuide } from '../state/GuideContext.tsx'
import type { Place } from '../types.ts'
import { Modal } from './Modal.tsx'
import { PlaceMedia } from './PlaceArt.tsx'
import { StatusToggle } from './PlaceCard.tsx'

export function PlaceDetail({ place }: { place: Place }) {
  const navigate = useNavigate()
  const { cityById, guidesForPlace, openSheet, requestSignIn, user, deleteUserPlace, sheet } = useGuide()
  const [copied, setCopied] = useState(false)
  const city = cityById(place.cityId)
  const guides = guidesForPlace(place.id)
  const house = guides.find((guide) => guide.kind === 'house')

  useEffect(() => {
    const previous = document.title
    document.title = `${place.name} · Gusto's Guide`
    return () => {
      document.title = previous
    }
  }, [place.name])

  function close() {
    if (window.history.length > 1) navigate(-1)
    else if (house) navigate(`/guide/${house.slug}`)
    else navigate('/')
  }

  async function share() {
    const url = shareUrl(place.slug)
    const payload = { title: place.name, text: place.note || place.dish, url }
    if (navigator.share) {
      try {
        await navigator.share(payload)
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
      window.prompt('Copy this link', url)
    }
  }

  if (sheet.type !== 'none') return null

  return (
    <Modal onClose={close} labelId="place-title" wide>
      <div className="grid sm:grid-cols-[1.1fr_1fr]">
        <PlaceMedia place={place} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="meta-line">
              {place.cuisine} | {place.neighborhood}
              {city ? ` · ${city.name}` : ''}
            </p>
            <button type="button" className="btn px-3 py-1 text-sm" onClick={close}>
              Close
            </button>
          </div>
          <h2 id="place-title" className="mt-2 font-serif text-5xl leading-none">
            {place.name}
          </h2>
          <p className="mt-3 inline-flex items-center gap-2 font-bold">
            <span className="rating-badge inline-badge">{formatRating(place.rating)}</span>
            <span>{priceLabel(place.price)}</span>
          </p>
          {place.dish ? <p className="mt-3 font-semibold">Get the {place.dish}.</p> : null}
          {place.note ? <p className="note mt-2">{place.note}</p> : null}
          <address className="mt-4 text-sm not-italic font-semibold">{place.address}</address>
          {place.hours ? (
            <p className="mt-3 text-sm whitespace-pre-line">{place.hours}</p>
          ) : (
            <p className="mt-3 text-sm text-muted">Hours not listed.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {place.website ? (
              <a className="btn text-sm" href={place.website} target="_blank" rel="noreferrer">
                {hostOf(place.website)}
              </a>
            ) : null}
            <a className="btn btn-navy text-sm" href={directionsUrl(place)} target="_blank" rel="noreferrer">
              Directions
            </a>
            <button type="button" className="btn text-sm" onClick={() => void share()}>
              {copied ? 'Link copied' : 'Share'}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusToggle place={place} />
            <button
              type="button"
              className="btn text-sm"
              onClick={() => {
                if (!user) requestSignIn({ type: 'save', placeId: place.id })
                else openSheet({ type: 'save', placeId: place.id })
              }}
            >
              Save to My guide
            </button>
          </div>
          {place.source === 'user' ? (
            <button
              type="button"
              className="btn mt-4 text-sm"
              onClick={() => {
                deleteUserPlace(place.id)
                close()
              }}
            >
              Delete place
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
