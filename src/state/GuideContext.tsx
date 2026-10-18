import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { SEED_CITIES, SEED_GUIDES, SEED_PLACES } from '../data/seed.ts'
import { clampRating, slugify, uniqueSlug } from '../lib/format.ts'
import { emptyDocument, storage } from '../lib/storage.ts'
import type {
  City,
  Guide,
  LocalUser,
  NewPlaceInput,
  Place,
  UserDocument,
  VisitStatus,
} from '../types.ts'

export type PendingAction =
  | { type: 'status'; placeId: string; status: VisitStatus }
  | { type: 'save'; placeId: string }
  | { type: 'add-city' }
  | { type: 'create-guide'; cityId?: string }
  | { type: 'add-place'; guideId: string }

export type SheetState =
  | { type: 'none' }
  | { type: 'signin' }
  | { type: 'add-city' }
  | { type: 'save'; placeId: string }
  | { type: 'create-guide'; cityId?: string }
  | { type: 'add-place'; guideId: string }

interface GuideContextValue {
  user: LocalUser | null
  cities: City[]
  places: Place[]
  guides: Guide[]
  statuses: Record<string, VisitStatus>
  sheet: SheetState
  announcement: string
  signIn: (name: string) => void
  signOut: () => void
  closeSheet: () => void
  requestSignIn: (pending?: PendingAction) => void
  openSheet: (sheet: SheetState) => void
  setStatus: (placeId: string, status: VisitStatus) => void
  addCity: (name: string, region: string) => City | null
  createGuide: (title: string, cityId: string, dek: string) => Guide | null
  renameGuide: (guideId: string, title: string) => void
  deleteGuide: (guideId: string) => void
  reorderGuides: (cityId: string, fromId: string, toId: string) => void
  addPlace: (input: NewPlaceInput, guideId?: string) => Place | null
  addPlaceToGuide: (guideId: string, placeId: string) => void
  removePlaceFromGuide: (guideId: string, placeId: string) => void
  reorderGuidePlaces: (guideId: string, fromId: string, toId: string) => void
  deleteUserPlace: (placeId: string) => void
  placeBySlug: (slug: string) => Place | undefined
  placeById: (id: string) => Place | undefined
  cityById: (id: string) => City | undefined
  guideBySlug: (slug: string) => Guide | undefined
  guideById: (id: string) => Guide | undefined
  guidesForPlace: (placeId: string) => Guide[]
}

const GuideContext = createContext<GuideContextValue | null>(null)

function applyStatus(document: UserDocument, placeId: string, status: VisitStatus): UserDocument {
  const statuses = { ...document.statuses }
  if (statuses[placeId] === status) delete statuses[placeId]
  else statuses[placeId] = status
  return { ...document, statuses }
}

function moveId(ids: string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId)
  const to = ids.indexOf(toId)
  if (from < 0 || to < 0 || from === to) return ids
  const next = ids.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(() => storage.getSession())
  const [document, setDocument] = useState<UserDocument>(() => {
    const session = storage.getSession()
    return session ? storage.loadUser(session.id) : emptyDocument()
  })
  const [sheet, setSheet] = useState<SheetState>({ type: 'none' })
  const [announcement, setAnnouncement] = useState('')
  const pendingRef = useRef<PendingAction | null>(null)

  useEffect(() => {
    if (user) storage.saveUser(user.id, document)
  }, [user, document])

  const cities = useMemo(() => [...SEED_CITIES, ...document.cities], [document.cities])
  const places = useMemo(() => [...SEED_PLACES, ...document.places], [document.places])
  const guides = useMemo(() => [...SEED_GUIDES, ...document.guides], [document.guides])

  const announce = useCallback((message: string) => {
    setAnnouncement('')
    window.setTimeout(() => setAnnouncement(message), 20)
  }, [])

  const placeById = useCallback((id: string) => places.find((place) => place.id === id), [places])
  const placeBySlug = useCallback(
    (slug: string) => places.find((place) => place.slug === slug),
    [places],
  )
  const cityById = useCallback((id: string) => cities.find((city) => city.id === id), [cities])
  const guideBySlug = useCallback(
    (slug: string) => guides.find((guide) => guide.slug === slug),
    [guides],
  )
  const guideById = useCallback((id: string) => guides.find((guide) => guide.id === id), [guides])
  const guidesForPlace = useCallback(
    (placeId: string) => guides.filter((guide) => guide.placeIds.includes(placeId)),
    [guides],
  )

  const openSheet = useCallback((next: SheetState) => setSheet(next), [])
  const closeSheet = useCallback(() => setSheet({ type: 'none' }), [])

  const requestSignIn = useCallback((pending?: PendingAction) => {
    pendingRef.current = pending ?? null
    setSheet({ type: 'signin' })
  }, [])

  const continuePending = useCallback(
    (pending: PendingAction | null, nextDocument: UserDocument) => {
      if (!pending) return nextDocument
      if (pending.type === 'status') {
        const place = [...SEED_PLACES, ...nextDocument.places].find((item) => item.id === pending.placeId)
        const updated = applyStatus(nextDocument, pending.placeId, pending.status)
        const on = updated.statuses[pending.placeId] === pending.status
        announce(
          on
            ? `${place?.name ?? 'Place'} marked ${pending.status === 'togo' ? 'to go' : 'been'}.`
            : `${place?.name ?? 'Place'} status cleared.`,
        )
        return updated
      }
      if (pending.type === 'save') setSheet({ type: 'save', placeId: pending.placeId })
      if (pending.type === 'add-city') setSheet({ type: 'add-city' })
      if (pending.type === 'create-guide') setSheet({ type: 'create-guide', cityId: pending.cityId })
      if (pending.type === 'add-place') setSheet({ type: 'add-place', guideId: pending.guideId })
      return nextDocument
    },
    [announce],
  )

  const signIn = useCallback(
    (name: string) => {
      const nextUser = storage.signIn(name)
      const pending = pendingRef.current
      pendingRef.current = null
      const loaded = continuePending(pending, storage.loadUser(nextUser.id))
      setUser(nextUser)
      setDocument(loaded)
      if (!pending || pending.type === 'status') setSheet({ type: 'none' })
      announce(`Signed in as ${nextUser.name}. Editing is on.`)
    },
    [announce, continuePending],
  )

  const signOut = useCallback(() => {
    storage.signOut()
    setUser(null)
    setDocument(emptyDocument())
    setSheet({ type: 'none' })
    announce('Signed out. House guides are still here. Your lists stay on this device.')
  }, [announce])

  const requireUser = useCallback((): boolean => {
    if (user) return true
    requestSignIn()
    return false
  }, [requestSignIn, user])

  const setStatus = useCallback(
    (placeId: string, status: VisitStatus) => {
      if (!user) {
        requestSignIn({ type: 'status', placeId, status })
        return
      }
      const place = places.find((item) => item.id === placeId)
      const turningOn = document.statuses[placeId] !== status
      setDocument((current) => applyStatus(current, placeId, status))
      announce(
        turningOn
          ? `${place?.name ?? 'Place'} marked ${status === 'togo' ? 'to go' : 'been'}.`
          : `${place?.name ?? 'Place'} status cleared.`,
      )
    },
    [announce, document.statuses, places, requestSignIn, user],
  )

  const addCity = useCallback(
    (name: string, region: string): City | null => {
      if (!requireUser()) return null
      const trimmed = name.trim()
      if (!trimmed) return null
      const slug = uniqueSlug(trimmed, cities.map((city) => city.slug))
      const city: City = {
        id: `city_${crypto.randomUUID()}`,
        name: trimmed,
        slug,
        region: region.trim(),
        blurb: 'A city you added on this device.',
        comingSoon: false,
        center: null,
      }
      setDocument((current) => ({ ...current, cities: [...current.cities, city] }))
      setSheet({ type: 'none' })
      announce(`${city.name} added.`)
      return city
    },
    [announce, cities, requireUser],
  )

  const createGuide = useCallback(
    (title: string, cityId: string, dek: string): Guide | null => {
      if (!requireUser()) return null
      const trimmed = title.trim()
      if (!trimmed || !cities.some((city) => city.id === cityId)) return null
      const guide: Guide = {
        id: crypto.randomUUID(),
        slug: uniqueSlug(trimmed, guides.map((item) => item.slug)),
        title: trimmed,
        cityId,
        dek: dek.trim() || 'A personal list.',
        kind: 'user',
        placeIds: [],
      }
      setDocument((current) => ({ ...current, guides: [...current.guides, guide] }))
      setSheet({ type: 'none' })
      announce(`${guide.title} created.`)
      return guide
    },
    [announce, cities, guides, requireUser],
  )

  const renameGuide = useCallback(
    (guideId: string, title: string) => {
      if (!requireUser()) return
      const trimmed = title.trim()
      if (!trimmed) return
      setDocument((current) => ({
        ...current,
        guides: current.guides.map((guide) =>
          guide.id === guideId ? { ...guide, title: trimmed, slug: slugify(trimmed) } : guide,
        ),
      }))
      announce('Guide renamed.')
    },
    [announce, requireUser],
  )

  const deleteGuide = useCallback(
    (guideId: string) => {
      if (!requireUser()) return
      setDocument((current) => ({
        ...current,
        guides: current.guides.filter((guide) => guide.id !== guideId),
      }))
      announce('Guide deleted. The places are still in your library.')
    },
    [announce, requireUser],
  )

  const reorderGuides = useCallback(
    (cityId: string, fromId: string, toId: string) => {
      if (!requireUser()) return
      setDocument((current) => {
        const cityGuides = current.guides.filter((guide) => guide.cityId === cityId)
        const moved = moveId(
          cityGuides.map((guide) => guide.id),
          fromId,
          toId,
        ).map((id) => cityGuides.find((guide) => guide.id === id)!)
        let cursor = 0
        return {
          ...current,
          guides: current.guides.map((guide) =>
            guide.cityId === cityId ? moved[cursor++] : guide,
          ),
        }
      })
    },
    [requireUser],
  )

  const addPlace = useCallback(
    (input: NewPlaceInput, guideId?: string): Place | null => {
      if (!requireUser()) return null
      const place: Place = {
        id: crypto.randomUUID(),
        slug: uniqueSlug(input.name, places.map((item) => item.slug)),
        name: input.name.trim(),
        cityId: input.cityId,
        neighborhood: input.neighborhood.trim(),
        cuisine: input.cuisine.trim(),
        price: input.price,
        rating: clampRating(input.rating),
        dish: input.dish.trim(),
        note: input.note.trim(),
        address: input.address.trim(),
        lat: input.lat,
        lng: input.lng,
        website: input.website,
        hours: input.hours?.trim() || undefined,
        photoUrl: input.photoUrl,
        source: 'user',
      }
      setDocument((current) => ({
        ...current,
        places: [...current.places, place],
        guides: guideId
          ? current.guides.map((guide) =>
              guide.id === guideId && !guide.placeIds.includes(place.id)
                ? { ...guide, placeIds: [...guide.placeIds, place.id] }
                : guide,
            )
          : current.guides,
      }))
      setSheet({ type: 'none' })
      announce(`${place.name} added.`)
      return place
    },
    [announce, places, requireUser],
  )

  const addPlaceToGuide = useCallback(
    (guideId: string, placeId: string) => {
      if (!requireUser()) return
      setDocument((current) => ({
        ...current,
        guides: current.guides.map((guide) =>
          guide.id === guideId && !guide.placeIds.includes(placeId)
            ? { ...guide, placeIds: [...guide.placeIds, placeId] }
            : guide,
        ),
      }))
      const place = places.find((item) => item.id === placeId)
      announce(`${place?.name ?? 'Place'} saved to your guide.`)
    },
    [announce, places, requireUser],
  )

  const removePlaceFromGuide = useCallback(
    (guideId: string, placeId: string) => {
      if (!requireUser()) return
      setDocument((current) => ({
        ...current,
        guides: current.guides.map((guide) =>
          guide.id === guideId
            ? { ...guide, placeIds: guide.placeIds.filter((id) => id !== placeId) }
            : guide,
        ),
      }))
      announce('Removed from this guide.')
    },
    [announce, requireUser],
  )

  const reorderGuidePlaces = useCallback(
    (guideId: string, fromId: string, toId: string) => {
      if (!requireUser()) return
      setDocument((current) => ({
        ...current,
        guides: current.guides.map((guide) =>
          guide.id === guideId
            ? { ...guide, placeIds: moveId(guide.placeIds, fromId, toId) }
            : guide,
        ),
      }))
    },
    [requireUser],
  )

  const deleteUserPlace = useCallback(
    (placeId: string) => {
      if (!requireUser()) return
      const place = document.places.find((item) => item.id === placeId)
      if (!place) return
      setDocument((current) => {
        const statuses = { ...current.statuses }
        delete statuses[placeId]
        return {
          ...current,
          places: current.places.filter((item) => item.id !== placeId),
          guides: current.guides.map((guide) => ({
            ...guide,
            placeIds: guide.placeIds.filter((id) => id !== placeId),
          })),
          statuses,
        }
      })
      announce(`${place.name} deleted from this device.`)
    },
    [announce, document.places, requireUser],
  )

  const value = useMemo<GuideContextValue>(
    () => ({
      user,
      cities,
      places,
      guides,
      statuses: document.statuses,
      sheet,
      announcement,
      signIn,
      signOut,
      closeSheet,
      requestSignIn,
      openSheet,
      setStatus,
      addCity,
      createGuide,
      renameGuide,
      deleteGuide,
      reorderGuides,
      addPlace,
      addPlaceToGuide,
      removePlaceFromGuide,
      reorderGuidePlaces,
      deleteUserPlace,
      placeBySlug,
      placeById,
      cityById,
      guideBySlug,
      guideById,
      guidesForPlace,
    }),
    [
      user,
      cities,
      places,
      guides,
      document.statuses,
      sheet,
      announcement,
      signIn,
      signOut,
      closeSheet,
      requestSignIn,
      openSheet,
      setStatus,
      addCity,
      createGuide,
      renameGuide,
      deleteGuide,
      reorderGuides,
      addPlace,
      addPlaceToGuide,
      removePlaceFromGuide,
      reorderGuidePlaces,
      deleteUserPlace,
      placeBySlug,
      placeById,
      cityById,
      guideBySlug,
      guideById,
      guidesForPlace,
    ],
  )

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>
}

export function useGuide(): GuideContextValue {
  const value = useContext(GuideContext)
  if (!value) throw new Error('useGuide must be used within GuideProvider')
  return value
}
