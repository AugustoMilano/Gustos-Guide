import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { geocodeAddress, type GeocodeHit } from '../lib/geo.ts'
import { clampRating, safeHttpUrl } from '../lib/format.ts'
import { useGuide } from '../state/GuideContext.tsx'
import type { Price } from '../types.ts'
import { Modal } from './Modal.tsx'

export function SignInSheet() {
  const { sheet, closeSheet, signIn } = useGuide()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  if (sheet.type !== 'signin') return null

  function submit(event: FormEvent) {
    event.preventDefault()
    const name = inputRef.current?.value.trim() ?? ''
    if (!name) {
      setError('Add your name to sign in.')
      inputRef.current?.focus()
      return
    }
    signIn(name)
  }

  return (
    <Modal onClose={closeSheet} labelId="signin-title" initialFocusRef={inputRef}>
      <form onSubmit={submit} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="signin-title" className="font-serif text-4xl leading-none">
            Sign in
          </h2>
          <button type="button" className="btn px-3 py-1 text-sm" onClick={closeSheet}>
            Close
          </button>
        </div>
        <p className="mt-3 text-sm">
          A name is enough. It unlocks editing on this browser and is shaped so a real account can replace it later.
        </p>
        <label className="field mt-4">
          <span>Your name</span>
          <input ref={inputRef} name="name" autoComplete="name" maxLength={40} aria-invalid={error ? true : undefined} aria-describedby={error ? 'signin-error' : undefined} />
        </label>
        {error ? (
          <p id="signin-error" className="mt-2 text-sm font-semibold text-[#9d1c08]">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-coral mt-4">
          Sign in
        </button>
      </form>
    </Modal>
  )
}

export function AddCitySheet({ onCreated }: { onCreated: (slug: string) => void }) {
  const { sheet, closeSheet, addCity } = useGuide()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  if (sheet.type !== 'add-city') return null

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '')
    const region = String(data.get('region') ?? '')
    if (!name.trim()) {
      setError('Name the city.')
      return
    }
    const city = addCity(name, region)
    if (city) onCreated(city.slug)
  }

  return (
    <Modal onClose={closeSheet} labelId="add-city-title" initialFocusRef={inputRef}>
      <form onSubmit={submit} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="add-city-title" className="font-serif text-4xl leading-none">
            Add a city
          </h2>
          <button type="button" className="btn px-3 py-1 text-sm" onClick={closeSheet}>
            Close
          </button>
        </div>
        <label className="field mt-4">
          <span>City</span>
          <input ref={inputRef} name="name" required maxLength={60} />
        </label>
        <label className="field mt-3">
          <span>Region</span>
          <input name="region" maxLength={60} placeholder="State or country" />
        </label>
        {error ? <p className="mt-2 text-sm font-semibold text-[#9d1c08]">{error}</p> : null}
        <button type="submit" className="btn btn-coral mt-4">
          Add city
        </button>
      </form>
    </Modal>
  )
}

export function CreateGuideSheet({ onCreated }: { onCreated: (id: string) => void }) {
  const { sheet, closeSheet, createGuide, cities } = useGuide()
  const inputRef = useRef<HTMLInputElement>(null)
  if (sheet.type !== 'create-guide') return null
  const defaultCity = sheet.cityId && cities.some((city) => city.id === sheet.cityId) ? sheet.cityId : cities[0]?.id

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const guide = createGuide(String(data.get('title') ?? ''), String(data.get('city') ?? ''), String(data.get('dek') ?? ''))
    if (guide) onCreated(guide.id)
  }

  return (
    <Modal onClose={closeSheet} labelId="create-guide-title" initialFocusRef={inputRef}>
      <form onSubmit={submit} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="create-guide-title" className="font-serif text-4xl leading-none">
            New guide
          </h2>
          <button type="button" className="btn px-3 py-1 text-sm" onClick={closeSheet}>
            Close
          </button>
        </div>
        <label className="field mt-4">
          <span>Title</span>
          <input ref={inputRef} name="title" required maxLength={80} />
        </label>
        <label className="field mt-3">
          <span>City</span>
          <select name="city" defaultValue={defaultCity}>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field mt-3">
          <span>Description</span>
          <textarea name="dek" maxLength={240} placeholder="Optional. What is this list for?" />
        </label>
        <button type="submit" className="btn btn-coral mt-4">
          Create guide
        </button>
      </form>
    </Modal>
  )
}

export function SaveSheet() {
  const { sheet, closeSheet, guides, user, addPlaceToGuide, removePlaceFromGuide, openSheet, placeById } = useGuide()
  if (sheet.type !== 'save' || !user) return null
  const place = placeById(sheet.placeId)
  const mine = guides.filter((guide) => guide.kind === 'user')

  return (
    <Modal onClose={closeSheet} labelId="save-title">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="save-title" className="font-serif text-4xl leading-none">
            Save {place?.name ?? 'place'}
          </h2>
          <button type="button" className="btn px-3 py-1 text-sm" onClick={closeSheet}>
            Close
          </button>
        </div>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm">You don't have a guide yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {mine.map((guide) => {
              const saved = guide.placeIds.includes(sheet.placeId)
              return (
                <li key={guide.id}>
                  <button
                    type="button"
                    className={`btn w-full justify-between ${saved ? 'btn-leaf' : ''}`}
                    aria-pressed={saved}
                    onClick={() => {
                      if (saved) removePlaceFromGuide(guide.id, sheet.placeId)
                      else addPlaceToGuide(guide.id, sheet.placeId)
                    }}
                  >
                    <span>{guide.title}</span>
                    <span>{saved ? 'Saved' : 'Add'}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        <button
          type="button"
          className="btn btn-coral mt-4"
          onClick={() => openSheet({ type: 'create-guide', cityId: place?.cityId })}
        >
          New guide
        </button>
      </div>
    </Modal>
  )
}

export function AddPlaceSheet() {
  const { sheet, closeSheet, addPlace, cities, guides } = useGuide()
  const inputRef = useRef<HTMLInputElement>(null)
  const [hits, setHits] = useState<GeocodeHit[]>([])
  const [geoError, setGeoError] = useState('')
  const [geoBusy, setGeoBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (sheet.type !== 'add-place') return
    setLat('')
    setLng('')
    setHits([])
    setGeoError('')
    setFormError('')
  }, [sheet])

  const guide = sheet.type === 'add-place' ? guides.find((item) => item.id === sheet.guideId) : undefined
  const defaultCity = guide?.cityId ?? cities[0]?.id ?? 'seattle'

  const priceOptions = useMemo(() => [1, 2, 3, 4] as Price[], [])

  if (sheet.type !== 'add-place') return null
  const guideId = sheet.guideId

  async function lookup() {
    const address = inputRef.current?.form?.address as HTMLInputElement | undefined
    const query = address?.value.trim() ?? ''
    if (query.length < 3) {
      setGeoError('Enter an address to look up.')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setGeoBusy(true)
    setGeoError('')
    setHits([])
    try {
      const next = await geocodeAddress(query, controller.signal)
      setHits(next)
      if (!next.length) setGeoError('No matches. Enter latitude and longitude yourself.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setGeoError('Geocoder unavailable. Enter latitude and longitude yourself.')
    } finally {
      setGeoBusy(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const latitude = Number(lat)
    const longitude = Number(lng)
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setFormError('Add a latitude and longitude, from the lookup or by hand.')
      return
    }
    const website = safeHttpUrl(String(data.get('website') ?? ''))
    if (String(data.get('website') ?? '').trim() && !website) {
      setFormError('Website needs to be an http(s) link.')
      return
    }
    const photo = safeHttpUrl(String(data.get('photo') ?? ''))
    if (String(data.get('photo') ?? '').trim() && !photo) {
      setFormError('Photo URL needs to be an http(s) link.')
      return
    }
    const place = addPlace(
      {
        name: String(data.get('name') ?? ''),
        cityId: String(data.get('city') ?? defaultCity),
        neighborhood: String(data.get('neighborhood') ?? ''),
        cuisine: String(data.get('cuisine') ?? ''),
        price: Number(data.get('price') ?? 2) as Price,
        rating: clampRating(Number(data.get('rating') ?? 0)),
        dish: String(data.get('dish') ?? ''),
        note: String(data.get('note') ?? ''),
        address: String(data.get('address') ?? ''),
        lat: latitude,
        lng: longitude,
        website,
        hours: String(data.get('hours') ?? ''),
        photoUrl: photo,
      },
      guideId,
    )
    if (!place) setFormError('Check the required fields and try again.')
  }

  return (
    <Modal onClose={closeSheet} labelId="add-place-title" initialFocusRef={inputRef} className="sm:max-w-xl">
      <form onSubmit={submit} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="add-place-title" className="font-serif text-4xl leading-none">
            Add a place
          </h2>
          <button type="button" className="btn px-3 py-1 text-sm" onClick={closeSheet}>
            Close
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span>Name</span>
            <input ref={inputRef} name="name" required maxLength={80} />
          </label>
          <label className="field">
            <span>City</span>
            <select name="city" defaultValue={defaultCity}>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Neighborhood</span>
            <input name="neighborhood" required maxLength={60} />
          </label>
          <label className="field">
            <span>Cuisine</span>
            <input name="cuisine" required maxLength={40} />
          </label>
          <label className="field">
            <span>Price</span>
            <select name="price" defaultValue="2">
              {priceOptions.map((price) => (
                <option key={price} value={price}>
                  {'$'.repeat(price)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Rating, 0 to 10</span>
            <input name="rating" type="number" required min={0} max={10} step={0.1} defaultValue={8} />
          </label>
          <label className="field">
            <span>Dish to get</span>
            <input name="dish" maxLength={80} />
          </label>
          <label className="field sm:col-span-2">
            <span>Note</span>
            <textarea name="note" maxLength={280} />
          </label>
          <label className="field sm:col-span-2">
            <span>Address</span>
            <input name="address" required maxLength={160} />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn text-sm" onClick={() => void lookup()} disabled={geoBusy}>
            {geoBusy ? 'Looking up…' : 'Look up address'}
          </button>
          <p className="text-xs text-muted">Uses the free Nominatim geocoder. Or type coordinates.</p>
        </div>
        {geoError ? <p className="mt-2 text-sm font-semibold">{geoError}</p> : null}
        {hits.length > 0 ? (
          <ul className="mt-2 max-h-36 space-y-1 overflow-auto" aria-label="Address matches">
            {hits.map((hit) => (
              <li key={`${hit.lat}-${hit.lng}-${hit.label}`}>
                <button
                  type="button"
                  className="btn w-full justify-start text-left text-sm"
                  onClick={() => {
                    setLat(String(hit.lat))
                    setLng(String(hit.lng))
                    setHits([])
                    setGeoError('')
                  }}
                >
                  {hit.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="field">
            <span>Latitude</span>
            <input value={lat} onChange={(event) => setLat(event.target.value)} inputMode="decimal" required />
          </label>
          <label className="field">
            <span>Longitude</span>
            <input value={lng} onChange={(event) => setLng(event.target.value)} inputMode="decimal" required />
          </label>
          <label className="field">
            <span>Website</span>
            <input name="website" inputMode="url" placeholder="https://" />
          </label>
          <label className="field">
            <span>Photo URL</span>
            <input name="photo" inputMode="url" placeholder="Optional" />
          </label>
          <label className="field col-span-2">
            <span>Hours</span>
            <textarea name="hours" placeholder="Optional" />
          </label>
        </div>
        {formError ? <p className="mt-2 text-sm font-semibold text-[#9d1c08]">{formError}</p> : null}
        <button type="submit" className="btn btn-coral mt-4">
          Save place
        </button>
      </form>
    </Modal>
  )
}
