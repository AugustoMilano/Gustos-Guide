import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import type { CityId } from '../lib/city.ts'
import {
  blurbProblem,
  cleanBlurb,
  cleanTitle,
  collectionSlug,
  titleProblem,
  type CollectionsStatus,
  type HouseCollection,
} from '../lib/collections.ts'
import { demo, demoFriendsEnabled, type DemoUser } from '../lib/demo.ts'
import { clearStashedAuthError, peekAuthError } from '../lib/auth-callback.ts'
import { canonicalUrl } from '../lib/site.ts'
import { compressToWebp, readPhotos, removePhoto, savePhoto, type StoredPhoto } from '../lib/photos.ts'
import { rescore } from '../lib/rank.ts'
import { mergeUploads, type LivePhoto } from '../lib/gallery.ts'
import type { HouseMark } from '../lib/quick-score.ts'
import { deleteGuideRemote, importLocalBundle, loadAccount, loadHouseMarks, loadHouseScores, loadNotices, loadOwnerPhotos, loadPlans, saveGuide, savePlan, type FriendLists, type FriendProfile, type FriendRequest } from '../social/account.ts'
import {
  addCollectionPlace,
  fetchCollections,
  insertCollection,
  orderCollectionPlaces,
  patchCollection,
  removeCollection,
  removeCollectionPlace,
  unpublishedNote,
} from '../social/collection-store.ts'
import { scanLocalBundle, type LocalBundle } from '../social/importLocal.ts'
import { authProviders, removePlacePhoto, savePlacePhoto, sendMagicLink, signInWithProvider, supabaseClient } from '../social/supabase.ts'
import type { Activity, Bucket, Comment, GuideVisibility, Notice, Plan, RankScore, SessionUser, UserGuide, VisitStatus } from '../types.ts'

// Augusto's Supabase user id. A session for it marks this device so cfa.js skips analytics.
const OWNER_ANALYTICS_ID = '6b6b61b0-983d-4772-9d80-836d3c43c235'

const SESSION_KEY = 'gusto.session.v1'
const HOUSE_KEY = 'gusto.house.v1'
const MARK_KEY = 'gusto.house-marks.v1'
const placeNames = new Map<string, string>()

function placeName(id: string) {
  return placeNames.get(id)
}

export type { LivePhoto }

export type ImportOffer = { places: number; guides: number; photos: number }

type Doc = {
  statuses: Record<string, VisitStatus>
  guides: UserGuide[]
  following: string[]
  activities: Activity[]
  likes: string[]
  comments: Comment[]
  plans: Plan[]
  notices: Notice[]
  order: Record<Bucket, string[]>
  scores: Record<string, RankScore>
}

type Compare = { placeId: string; bucket: Bucket; low: number; high: number }

type AppValue = {
  user: SessionUser | null
  supabase: boolean
  authProviders: Array<'apple' | 'google' | 'x'>
  signIn: (name: string) => Promise<void>
  sendMagicLink: (email: string) => Promise<void>
  signInProvider: (provider: 'apple' | 'google' | 'x') => Promise<void>
  signOut: () => void
  statuses: Record<string, VisitStatus>
  setStatus: (placeId: string, status: VisitStatus) => void
  /** Reload this account from the server (pull-to-refresh). */
  refresh: () => Promise<void>
  guides: UserGuide[]
  createGuide: (title: string) => void
  renameGuide: (id: string, title: string) => void
  deleteGuide: (id: string) => void
  addToGuide: (guideId: string, placeId: string) => void
  removeFromGuide: (guideId: string, placeId: string) => void
  moveInGuide: (guideId: string, placeId: string, direction: -1 | 1) => void
  reorderGuide: (guideId: string, placeIds: string[]) => void
  setGuidePublic: (guideId: string, isPublic: boolean) => void
  setGuideVisibility: (guideId: string, visibility: GuideVisibility) => void
  setGuideCover: (guideId: string, placeId: string) => void
  setGuideLook: (guideId: string, look: { emoji?: string; color?: string }) => void
  setPlaceNote: (guideId: string, placeId: string, note: string) => void
  shareGuide: (guideId: string, collaboratorId: string) => void
  shareGuideByHandle: (guideId: string, handle: string) => Promise<void>
  inviteLink: (kind: 'guide' | 'plan', id: string) => string
  following: string[]
  toggleFollow: (userId: string) => void
  requestFriend: (handle: string) => Promise<void>
  inviteByEmail: (email: string) => Promise<string>
  createFriendLink: () => Promise<string>
  respondFriend: (id: string, accept: boolean) => Promise<void>
  friends: FriendProfile[]
  friendLists: FriendLists
  requests: FriendRequest[]
  activities: Activity[]
  toggleLike: (activityId: string) => void
  likes: string[]
  comments: Comment[]
  addComment: (activityId: string, text: string) => void
  plans: Plan[]
  createPlan: (title: string, placeIds: string[], dates: string[], options?: { vibe?: string; votePlaceId?: string; locked?: boolean; inviteIds?: string[]; time?: string }) => string
  votePlan: (planId: string, placeId: string, date: string, time?: string) => void
  rsvpPlan: (planId: string, rsvp: 'yes' | 'no' | 'maybe') => void
  lockPlan: (planId: string) => void
  joinInvite: (token: string) => Promise<'guide' | 'plan' | 'friend' | null>
  notices: Notice[]
  markNoticesRead: () => void
  scores: Record<string, RankScore>
  order: Record<Bucket, string[]>
  compare: Compare | null
  startRank: (placeId: string, bucket: Bucket) => void
  answerRank: (choice: 'new' | 'old' | 'close' | 'skip') => void
  photos: LivePhoto[]
  photosReady: boolean
  uploadPhoto: (placeId: string, file: File) => Promise<void>
  deletePhoto: (id: string) => Promise<void>
  demoUsers: DemoUser[]
  friendScore: (placeId: string) => { average: number | null; loved: number; count: number; demo: boolean }
  friendMarks: (placeId: string) => { id: string; name: string; handle: string; score: number }[]
  gustoScore: (placeId: string) => number | null
  houseScores: Record<string, number>
  setHouseScore: (placeId: string, score: number | null) => void
  houseMark: (placeId: string) => HouseMark | null
  setHouseMark: (placeId: string, status: HouseMark | null) => void
  collections: HouseCollection[]
  collectionsStatus: CollectionsStatus
  collectionsMessage: string
  createCollection: (city: CityId, title: string, blurb: string, placeIds?: string[]) => Promise<string | null>
  renameCollection: (id: string, title: string, blurb: string) => Promise<boolean>
  deleteCollection: (id: string) => Promise<void>
  setCollectionPlace: (collectionId: string, placeId: string, include: boolean) => void
  reorderCollection: (collectionId: string, placeIds: string[]) => void
  tasteMatch: (userId: string) => number | null
  announcement: string
  authError: string | null
  noteAuthFailure: (message: string) => void
  clearAuthError: () => void
  importOffer: ImportOffer | null
  acceptImport: () => Promise<void>
  dismissImport: () => void
}

const Ctx = createContext<AppValue | null>(null)

function emptyDoc(): Doc {
  const live = Boolean(supabaseClient())
  return {
    statuses: {},
    guides: [],
    following: live || !demoFriendsEnabled ? [] : demo.users.map((user) => user.id),
    activities: [],
    likes: [],
    comments: [],
    plans: [],
    notices: [],
    order: { loved: [], liked: [], fine: [], didnt: [] },
    scores: {},
  }
}

function ownerName(name: string): boolean {
  const key = name.trim().toLowerCase()
  return key === 'augusto' || key === 'gusto' || key === 'augusto milano'
}

function handleOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'guest'
}

function loadDoc(id: string): Doc {
  const raw = localStorage.getItem(`gusto.doc.v1.${id}`)
  if (!raw) return emptyDoc()
  const parsed = JSON.parse(raw) as Doc
  return {
    ...emptyDoc(),
    ...parsed,
    order: { ...emptyDoc().order, ...parsed.order },
    notices: parsed.notices ?? [],
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const remote = useMemo(() => supabaseClient(), [])
  const providers = useMemo(() => authProviders(), [])
  const [user, setUser] = useState<SessionUser | null>(null)
  const [doc, setDoc] = useState<Doc>(emptyDoc)
  const [photos, setPhotos] = useState<LivePhoto[]>([])
  const [housePhotos, setHousePhotos] = useState<LivePhoto[]>([])
  const [photosReady, setPhotosReady] = useState(false)
  const [compare, setCompare] = useState<Compare | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [authError, setAuthError] = useState<string | null>(() => peekAuthError())
  const [house, setHouse] = useState<Record<string, number>>({})
  const [marks, setMarks] = useState<Record<string, HouseMark>>({})
  const [collections, setCollections] = useState<HouseCollection[]>([])
  const collectionsRef = useRef<HouseCollection[]>([])
  const [collectionsStatus, setCollectionsStatus] = useState<CollectionsStatus>(remote ? 'loading' : 'offline')
  const collectionsStatusRef = useRef(collectionsStatus)
  const [collectionsMessage, setCollectionsMessage] = useState('')
  const marksRef = useRef(marks)
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [friendRanks, setFriendRanks] = useState<Record<string, Record<string, number>>>({})
  const [friendLists, setFriendLists] = useState<FriendLists>({})
  const [importOffer, setImportOffer] = useState<ImportOffer | null>(null)
  const importBundle = useRef<LocalBundle | null>(null)
  const generation = useRef(0)
  const hydrateRef = useRef<(authUser: User | null) => Promise<void>>(async () => {})

  function remoteError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not save that.'
    setAnnouncement(message)
  }

  function markTableMissing(error: unknown): boolean {
    const record = error as { code?: string; message?: string }
    return record?.code === '42P01' || /house_marks|schema cache|could not find the table/i.test(record?.message ?? '')
  }

  async function hydrate(authUser: User | null) {
    if (!remote) return
    const ticket = ++generation.current
    if (!authUser) {
      setUser(null)
      setDoc(emptyDoc())
      setPhotos([])
      setFriends([])
      setRequests([])
      setFriendRanks({})
      setFriendLists({})
      setImportOffer(null)
      importBundle.current = null
      return
    }
    try {
      const snap = await loadAccount(remote, authUser)
      if (ticket !== generation.current) return
      setUser(snap.user)
      setDoc(snap.doc)
      if (snap.house) setHouse(snap.house)
      setPhotos(snap.photos)
      setFriends(snap.friends)
      setRequests(snap.requests)
      setFriendRanks(snap.friendRanks)
      setFriendLists(snap.friendLists)
      localStorage.setItem(`gusto.doc.v1.${snap.user.id}`, JSON.stringify(snap.doc))
      const bundle = snap.counts.places || snap.counts.guides || snap.counts.photos ? null : await scanLocalBundle(snap.user.id)
      if (ticket !== generation.current) return
      importBundle.current = bundle
      setImportOffer(bundle ? { places: Object.keys(bundle.statuses).length, guides: bundle.guides.length, photos: bundle.photos.length } : null)
    } catch (error) {
      if (ticket !== generation.current) return
      const fallback: SessionUser = {
        id: authUser.id,
        name: authUser.email?.split('@')[0] || 'Guest',
        handle: handleOf(authUser.email?.split('@')[0] || 'guest'),
        isOwner: false,
      }
      setUser(fallback)
      setDoc(loadDoc(authUser.id))
      remoteError(error)
    }
  }

  useEffect(() => {
    void import('../content/load.ts').then(async (mod) => {
      await mod.catalogReady
      for (const place of mod.catalog.places) placeNames.set(place.id, place.name)
    })
  }, [])

  useEffect(() => {
    hydrateRef.current = hydrate
  })

  useEffect(() => {
    collectionsStatusRef.current = collectionsStatus
  }, [collectionsStatus])

  const noteAuthFailure = useCallback((message: string) => {
    const text = message.trim()
    if (!text) return
    setAuthError((current) => current || text)
  }, [])

  function clearAuthError() {
    setAuthError(null)
    clearStashedAuthError()
  }

  useEffect(() => {
    const onError = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      if (typeof detail === 'string' && detail.trim()) setAuthError((current) => current || detail.trim())
    }
    window.addEventListener('gusto-auth-error', onError)
    return () => window.removeEventListener('gusto-auth-error', onError)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOUSE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>
        if (parsed && typeof parsed === 'object') setHouse(parsed)
      }
    } catch {
      setHouse({})
    }
    try {
      const raw = localStorage.getItem(MARK_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, HouseMark>
      if (!parsed || typeof parsed !== 'object') return
      const stored: Record<string, HouseMark> = {}
      for (const [id, status] of Object.entries(parsed)) {
        if (status === 'havent') stored[id] = 'havent'
      }
      marksRef.current = stored
      setMarks(stored)
    } catch {
      marksRef.current = {}
      setMarks({})
    }
  }, [])

  useEffect(() => {
    if (!remote) return
    let cancel = false
    void fetchCollections(remote).then((result) => {
      if (cancel) return
      if (result.ok) {
        setCollections((current) => {
          const serverIds = new Set(result.rows.map((row) => row.id))
          const extras = current.filter((row) => row.published && !serverIds.has(row.id))
          const drafts = current.filter((row) => !row.published)
          const next = [...result.rows, ...extras, ...drafts]
          collectionsRef.current = next
          return next
        })
        setCollectionsStatus('ready')
        setCollectionsMessage('')
        return
      }
      if (result.missing) {
        setCollectionsStatus('missing')
        setCollectionsMessage(unpublishedNote(true))
        return
      }
      setCollectionsStatus('error')
      setCollectionsMessage(result.message)
    }).catch((error: unknown) => {
      if (cancel) return
      setCollectionsStatus('error')
      setCollectionsMessage(error instanceof Error ? error.message : 'Could not load collections.')
    })
    void loadHouseScores(remote).then((scores) => {
      if (!cancel && scores) setHouse(scores)
    })
    void loadOwnerPhotos(remote).then((rows) => {
      if (cancel) return
      setHousePhotos(rows)
      setPhotosReady(true)
    }).catch(() => {
      if (!cancel) setPhotosReady(true)
    })
    return () => {
      cancel = true
    }
  }, [remote])

  useEffect(() => {
    if (!remote || !user?.isOwner) return
    let cancel = false
    void loadHouseMarks(remote).then((rows) => {
      if (cancel || !rows) return
      marksRef.current = rows
      setMarks(rows)
    })
    return () => {
      cancel = true
    }
  }, [remote, user?.isOwner])

  useEffect(() => {
    if (remote) return
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    const session = JSON.parse(raw) as SessionUser
    setUser(session)
    setDoc(loadDoc(session.id))
  }, [remote])

  useEffect(() => {
    if (!remote) return
    const { data } = remote.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      if (session?.user?.id === OWNER_ANALYTICS_ID) {
        try { localStorage.setItem('gg_owner', '1') } catch { /* storage off */ }
      }
      setTimeout(() => {
        void hydrateRef.current(session?.user ?? null)
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [remote])

  useEffect(() => {
    if (remote) return
    let cancelled = false
    const urls: string[] = []
    void readPhotos().then((rows) => {
      if (cancelled) return
      setPhotos(
        rows.map((row) => {
          const url = URL.createObjectURL(row.blob)
          urls.push(url)
          return { ...row, url }
        }),
      )
      setPhotosReady(true)
    }).catch(() => {
      if (!cancelled) setPhotosReady(true)
    })
    return () => {
      cancelled = true
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [remote])

  useEffect(() => {
    if (!remote || !user) return
    let cancel = false
    const refreshPlans = () => {
      void loadPlans(remote).then((plans) => {
        if (!cancel) setDoc((current) => ({ ...current, plans }))
      })
    }
    const refreshNotes = () => {
      void loadNotices(remote).then((notices) => {
        if (!cancel) setDoc((current) => ({ ...current, notices }))
      })
    }
    const channel = remote
      .channel(`live-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, refreshNotes)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, refreshPlans)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_members' }, refreshPlans)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_votes' }, refreshPlans)
      .subscribe()
    return () => {
      cancel = true
      void remote.removeChannel(channel)
    }
  }, [remote, user])

  function persist(next: Doc, session = user) {
    setDoc(next)
    if (session) localStorage.setItem(`gusto.doc.v1.${session.id}`, JSON.stringify(next))
  }

  function pushGuide(guide: UserGuide | undefined, session = user) {
    if (!remote || !session || !guide || guide.demo) return
    void saveGuide(remote, session.id, guide).catch(remoteError)
  }

  function pushPlan(plan: Plan | undefined, session = user) {
    if (!remote || !session || !plan || plan.demo) return
    void savePlan(remote, session.id, plan).catch(remoteError)
  }

  function pushActivity(next: Doc, activity: Activity, session: SessionUser) {
    next.activities = [activity, ...next.activities]
    if (!remote) return
    void remote.from('activities').insert({
      id: activity.id,
      user_id: session.id,
      type: activity.type,
      place_id: activity.placeId,
      list_id: activity.listId,
      list_title: activity.listTitle,
      body: activity.text,
      score: activity.score,
    }).then(({ error }) => {
      if (error) remoteError(error)
    })
  }

  function pushNotice(notice: Notice, session = user) {
    if (!remote || !session) return
    void remote.from('notifications').insert({
      id: notice.id,
      user_id: session.id,
      body: notice.text,
      href: notice.href,
      read: notice.read,
    }).then(({ error }) => {
      if (error) remoteError(error)
    })
  }

  async function signIn(name: string) {
    const trimmed = name.trim()
    if (!trimmed || remote) return
    const session: SessionUser = {
      id: `local-${handleOf(trimmed)}`,
      name: trimmed,
      handle: handleOf(trimmed),
      isOwner: ownerName(trimmed),
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    setDoc(loadDoc(session.id))
    setAnnouncement(`Signed in as ${trimmed}.`)
  }

  async function emailLink(email: string) {
    if (!remote) throw new Error('Supabase is not configured.')
    await sendMagicLink(remote, email)
    setAnnouncement('Check your email for a sign-in link.')
  }

  async function providerSignIn(provider: 'apple' | 'google' | 'x') {
    if (!remote) throw new Error('Supabase is not configured.')
    if (!providers.includes(provider)) throw new Error('That sign-in is not turned on.')
    await signInWithProvider(remote, provider)
  }

  function signOut() {
    if (remote) void remote.auth.signOut()
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setDoc(emptyDoc())
    setFriends([])
    setRequests([])
    setFriendRanks({})
    setImportOffer(null)
    importBundle.current = null
    setCompare(null)
    if (remote) setPhotos([])
  }

  function setStatus(placeId: string, status: VisitStatus) {
    if (!user) return
    const next = { ...doc, statuses: { ...doc.statuses } }
    const turningOff = next.statuses[placeId] === status
    if (turningOff) delete next.statuses[placeId]
    else next.statuses[placeId] = status
    const name = placeName(placeId)
    pushActivity(
      next,
      {
        id: crypto.randomUUID(),
        userId: user.id,
        type: status === 'been' ? 'been' : 'saved',
        placeId,
        text: turningOff ? `Cleared ${name ?? 'a place'}.` : `${status === 'been' ? 'Been' : 'Saved'} ${name ?? 'a place'}.`,
        createdAt: new Date().toISOString(),
      },
      user,
    )
    persist(next)
    if (remote) {
      const write = turningOff
        ? remote.from('place_status').delete().eq('user_id', user.id).eq('place_id', placeId)
        : remote.from('place_status').upsert({ user_id: user.id, place_id: placeId, status })
      void write.then(({ error }) => {
        if (error) remoteError(error)
      })
    }
  }

  function createGuide(title: string) {
    if (!user) return
    const guide: UserGuide = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Untitled list',
      placeIds: [],
      shared: false,
      collaboratorIds: [],
      ownerId: user.id,
      isPublic: false,
      visibility: 'private',
      inviteToken: crypto.randomUUID().slice(0, 8),
    }
    const next = { ...doc, guides: [guide, ...doc.guides] }
    pushActivity(next, { id: crypto.randomUUID(), userId: user.id, type: 'list', listId: guide.id, listTitle: guide.title, text: `Started ${guide.title}.`, createdAt: new Date().toISOString() }, user)
    persist(next)
    pushGuide(guide)
  }

  function renameGuide(id: string, title: string) {
    const next = { ...doc, guides: doc.guides.map((guide) => (guide.id === id ? { ...guide, title } : guide)) }
    persist(next)
    pushGuide(next.guides.find((guide) => guide.id === id))
  }

  function deleteGuide(id: string) {
    persist({ ...doc, guides: doc.guides.filter((guide) => guide.id !== id) })
    if (remote) void deleteGuideRemote(remote, id).catch(remoteError)
  }

  function addToGuide(guideId: string, placeId: string) {
    const next = {
      ...doc,
      guides: doc.guides.map((guide) => {
        if (guide.id !== guideId || guide.placeIds.includes(placeId)) return guide
        return {
          ...guide,
          placeIds: [...guide.placeIds, placeId],
          addedAt: { ...guide.addedAt, [placeId]: new Date().toISOString() },
        }
      }),
    }
    persist(next)
    pushGuide(next.guides.find((guide) => guide.id === guideId))
  }

  function removeFromGuide(guideId: string, placeId: string) {
    const next = {
      ...doc,
      guides: doc.guides.map((guide) => {
        if (guide.id !== guideId) return guide
        const notes = { ...guide.notes }
        const addedAt = { ...guide.addedAt }
        delete notes[placeId]
        delete addedAt[placeId]
        return { ...guide, placeIds: guide.placeIds.filter((id) => id !== placeId), notes, addedAt }
      }),
    }
    persist(next)
    pushGuide(next.guides.find((guide) => guide.id === guideId))
  }

  function moveInGuide(guideId: string, placeId: string, direction: -1 | 1) {
    const next = {
      ...doc,
      guides: doc.guides.map((guide) => {
        if (guide.id !== guideId) return guide
        const index = guide.placeIds.indexOf(placeId)
        const target = index + direction
        if (index < 0 || target < 0 || target >= guide.placeIds.length) return guide
        const placeIds = guide.placeIds.slice()
        const [item] = placeIds.splice(index, 1)
        placeIds.splice(target, 0, item)
        return { ...guide, placeIds }
      }),
    }
    persist(next)
    pushGuide(next.guides.find((guide) => guide.id === guideId))
  }

  function reorderGuide(guideId: string, placeIds: string[]) {
    if (!user) return
    const next = { ...doc, guides: doc.guides.map((guide) => (guide.id === guideId ? { ...guide, placeIds } : guide)) }
    persist(next)
    pushGuide(next.guides.find((guide) => guide.id === guideId))
  }

  function setGuideVisibility(guideId: string, visibility: GuideVisibility) {
    if (!user) return
    const next = {
      ...doc,
      guides: doc.guides.map((guide) =>
        guide.id === guideId
          ? { ...guide, visibility, isPublic: visibility === 'public', shared: visibility !== 'private' || guide.collaboratorIds.length > 0 }
          : guide,
      ),
    }
    persist(next)
    pushGuide(next.guides.find((guide) => guide.id === guideId))
  }

  function setGuidePublic(guideId: string, isPublic: boolean) {
    setGuideVisibility(guideId, isPublic ? 'public' : 'private')
  }

  function setGuideCover(guideId: string, placeId: string) {
    if (!user) return
    const next = { ...doc, guides: doc.guides.map((guide) => (guide.id === guideId ? { ...guide, coverPlaceId: placeId } : guide)) }
    persist(next)
    pushGuide(next.guides.find((guide) => guide.id === guideId))
  }

  function setGuideLook(guideId: string, look: { emoji?: string; color?: string }) {
    if (!user) return
    const next = {
      ...doc,
      guides: doc.guides.map((guide) => (guide.id === guideId ? { ...guide, ...look } : guide)),
    }
    persist(next)
    pushGuide(next.guides.find((guide) => guide.id === guideId))
  }

  function setPlaceNote(guideId: string, placeId: string, note: string) {
    if (!user) return
    const text = note.trim().slice(0, 140)
    const next = {
      ...doc,
      guides: doc.guides.map((guide) => {
        if (guide.id !== guideId) return guide
        const notes = { ...guide.notes }
        if (text) notes[placeId] = text
        else delete notes[placeId]
        return { ...guide, notes }
      }),
    }
    persist(next)
    pushGuide(next.guides.find((guide) => guide.id === guideId))
  }

  function shareGuide(guideId: string, collaboratorId: string) {
    if (!user) return
    const next = {
      ...doc,
      guides: doc.guides.map((guide) =>
        guide.id === guideId
          ? {
              ...guide,
              shared: true,
              visibility: guide.visibility === 'private' || !guide.visibility ? 'friends' : guide.visibility,
              collaboratorIds: guide.collaboratorIds.includes(collaboratorId) ? guide.collaboratorIds : [...guide.collaboratorIds, collaboratorId],
            }
          : guide,
      ),
    }
    const guide = next.guides.find((item) => item.id === guideId)
    pushActivity(next, { id: crypto.randomUUID(), userId: user.id, type: 'list', listId: guideId, listTitle: guide?.title, text: `Shared ${guide?.title ?? 'a list'}.`, createdAt: new Date().toISOString() }, user)
    persist(next)
    pushGuide(guide)
  }

  async function shareGuideByHandle(guideId: string, handle: string) {
    if (!remote) return
    const cleaned = handle.trim().toLowerCase()
    const { data, error } = await remote.from('profiles').select('id').eq('handle', cleaned).maybeSingle()
    if (error) throw error
    if (!data) throw new Error('No one uses that username.')
    shareGuide(guideId, data.id)
  }

  function toggleFollow(userId: string) {
    if (remote) return
    const following = doc.following.includes(userId) ? doc.following.filter((id) => id !== userId) : [...doc.following, userId]
    persist({ ...doc, following })
  }

  async function requestFriend(handle: string) {
    if (!remote || !user) throw new Error('Sign in first.')
    const { error } = await remote.rpc('request_friend', { target_handle: handle.trim().toLowerCase() })
    if (error) throw error
    await hydrateRef.current((await remote.auth.getUser()).data.user)
    setAnnouncement('Friend request sent.')
  }

  async function inviteByEmail(email: string) {
    if (!remote || !user) throw new Error('Sign in first.')
    const { data, error } = await remote.rpc('invite_friend_email', { target_email: email.trim() })
    if (error) throw error
    await hydrateRef.current((await remote.auth.getUser()).data.user)
    if (!data) {
      setAnnouncement('Friend request sent.')
      return ''
    }
    const link = canonicalUrl(`#/join/${data}`)
    setAnnouncement('Invite link ready.')
    return link
  }

  async function createFriendLink() {
    if (!user) throw new Error('Sign in first.')
    if (!remote) {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      const raw = localStorage.getItem('gusto.friend-links.v1')
      const bag = raw ? (JSON.parse(raw) as { token: string; name: string; handle: string }[]) : []
      bag.push({ token, name: user.name, handle: user.handle })
      localStorage.setItem('gusto.friend-links.v1', JSON.stringify(bag.slice(-20)))
      const link = canonicalUrl(`#/join/${token}`)
      setAnnouncement('Invite link ready.')
      return link
    }
    const { data, error } = await remote.rpc('create_friend_link')
    if (error) throw new Error(error.message.includes('create_friend_link') ? 'Friend links need the latest database update.' : error.message)
    const link = canonicalUrl(`#/join/${data}`)
    setAnnouncement('Invite link ready.')
    return link
  }

  async function respondFriend(id: string, accept: boolean) {
    if (!remote || !user) return
    const { error } = await remote.rpc('respond_friend', { friendship: id, accept })
    if (error) throw error
    await hydrateRef.current((await remote.auth.getUser()).data.user)
  }

  function toggleLike(activityId: string) {
    if (!user) return
    const likes = doc.likes.includes(activityId) ? doc.likes.filter((id) => id !== activityId) : [...doc.likes, activityId]
    persist({ ...doc, likes })
    if (remote) {
      const write = likes.includes(activityId)
        ? remote.from('activity_likes').upsert({ activity_id: activityId, user_id: user.id })
        : remote.from('activity_likes').delete().eq('activity_id', activityId).eq('user_id', user.id)
      void write.then(({ error }) => {
        if (error) remoteError(error)
      })
    }
  }

  function addComment(activityId: string, text: string) {
    if (!user || !text.trim()) return
    const comment: Comment = { id: crypto.randomUUID(), activityId, userId: user.id, text: text.trim(), createdAt: new Date().toISOString() }
    const notice: Notice = {
      id: crypto.randomUUID(),
      text: 'A comment was posted on the feed.',
      href: '/feed',
      read: false,
      createdAt: comment.createdAt,
    }
    persist({ ...doc, comments: [...doc.comments, comment], notices: [notice, ...doc.notices].slice(0, 40) })
    pushNotice(notice)
    if (remote) {
      void remote.from('comments').insert({ id: comment.id, activity_id: activityId, user_id: user.id, body: comment.text }).then(({ error }) => {
        if (error) remoteError(error)
      })
    }
  }

  function createPlan(
    title: string,
    placeIds: string[],
    dates: string[],
    options?: { vibe?: string; votePlaceId?: string; locked?: boolean; inviteIds?: string[]; time?: string },
  ) {
    if (!user) return ''
    const inviteIds = (options?.inviteIds ?? (remote || !demoFriendsEnabled ? [] : demo.users.map((person) => person.id))).filter((id) => id !== user.id)
    const plan: Plan = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Go together',
      hostId: user.id,
      placeIds,
      dates,
      votes: options?.votePlaceId || options?.time
        ? { [user.id]: { placeId: options.votePlaceId, date: dates[0], time: options.time || undefined } }
        : {},
      rsvps: { [user.id]: 'yes' },
      inviteIds,
      locked: Boolean(options?.locked),
      vibe: options?.vibe,
      inviteToken: crypto.randomUUID().slice(0, 8),
    }
    const notice: Notice = {
      id: crypto.randomUUID(),
      text: `Plan started: ${plan.title}.`,
      href: `/plan/${plan.id}`,
      read: false,
      createdAt: new Date().toISOString(),
    }
    persist({ ...doc, plans: [plan, ...doc.plans], notices: [notice, ...doc.notices].slice(0, 40) })
    pushNotice(notice)
    pushPlan(plan)
    return plan.id
  }

  function lockPlan(planId: string) {
    if (!user) return
    const plan = doc.plans.find((item) => item.id === planId)
    const notice: Notice = {
      id: crypto.randomUUID(),
      text: plan ? `Locked in ${plan.title}.` : 'A dinner plan was locked in.',
      href: `/plan/${planId}`,
      read: false,
      createdAt: new Date().toISOString(),
    }
    const next = {
      ...doc,
      plans: doc.plans.map((item) => (item.id === planId ? { ...item, locked: true } : item)),
      notices: [notice, ...doc.notices].slice(0, 40),
    }
    persist(next)
    pushNotice(notice)
    pushPlan(next.plans.find((item) => item.id === planId))
  }

  function inviteLink(kind: 'guide' | 'plan', id: string) {
    const guides = remote || !demoFriendsEnabled ? doc.guides : [...doc.guides, ...demo.lists]
    const plans = remote || !demoFriendsEnabled ? doc.plans : [...doc.plans, ...demo.plans]
    if (kind === 'plan') {
      const plan = plans.find((item) => item.id === id)
      const token = plan?.inviteToken || plan?.id || id
      return canonicalUrl(`#/join/${token}`)
    }
    const guide = guides.find((item) => item.id === id)
    const token = guide?.inviteToken || guide?.id || id
    return canonicalUrl(`#/join/${token}`)
  }

  function markNoticesRead() {
    persist({ ...doc, notices: doc.notices.map((notice) => ({ ...notice, read: true })) })
    if (remote && user) {
      void remote.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    }
  }

  async function joinInvite(token: string): Promise<'guide' | 'plan' | 'friend' | null> {
    if (!user) return null
    if (remote) {
      const { data, error } = await remote.rpc('accept_invite', { token })
      if (error) throw error
      const kind = data === 'guide' || data === 'plan' || data === 'friend' ? data : null
      const auth = await remote.auth.getUser()
      await hydrateRef.current(auth.data.user)
      return kind
    }
    const guide = [...doc.guides, ...(demoFriendsEnabled ? demo.lists : [])].find((item) => item.inviteToken === token || item.id === token)
    if (guide) {
      const base = doc.guides.find((item) => item.id === guide.id) ?? guide
      const nextGuide: UserGuide = {
        ...base,
        shared: true,
        collaboratorIds: base.collaboratorIds.includes(user.id) ? base.collaboratorIds : [...base.collaboratorIds, user.id],
      }
      persist({ ...doc, guides: [nextGuide, ...doc.guides.filter((item) => item.id !== guide.id)] })
      return 'guide'
    }
    const plan = [...doc.plans, ...(demoFriendsEnabled ? demo.plans : [])].find((item) => item.inviteToken === token || item.id === token)
    if (!plan) return null
    const base = doc.plans.find((item) => item.id === plan.id) ?? plan
    const nextPlan: Plan = { ...base, rsvps: { ...base.rsvps, [user.id]: 'yes' } }
    persist({ ...doc, plans: [nextPlan, ...doc.plans.filter((item) => item.id !== plan.id)] })
    return 'plan'
  }

  function votePlan(planId: string, placeId: string, date: string, time?: string) {
    if (!user) return
    const next = {
      ...doc,
      plans: doc.plans.map((plan) =>
        plan.id === planId ? { ...plan, votes: { ...plan.votes, [user.id]: { placeId, date, time } } } : plan,
      ),
    }
    persist(next)
    pushPlan(next.plans.find((plan) => plan.id === planId))
  }

  function rsvpPlan(planId: string, rsvp: 'yes' | 'no' | 'maybe') {
    if (!user) return
    const next = {
      ...doc,
      plans: doc.plans.map((plan) => (plan.id === planId ? { ...plan, rsvps: { ...plan.rsvps, [user.id]: rsvp } } : plan)),
    }
    persist(next)
    pushPlan(next.plans.find((plan) => plan.id === planId))
  }

  function finishRank(nextOrder: string[], bucket: Bucket, placeId: string) {
    if (!user) return
    const order = { ...doc.order, [bucket]: nextOrder }
    const bucketScores = rescore(bucket, nextOrder)
    const scores = { ...doc.scores }
    for (const id of Object.keys(scores)) if (scores[id].bucket === bucket && !nextOrder.includes(id)) delete scores[id]
    Object.assign(scores, bucketScores)
    const next = { ...doc, order, scores }
    pushActivity(next, { id: crypto.randomUUID(), userId: user.id, type: 'rated', placeId, text: `Ranked ${placeName(placeId) ?? 'a place'}.`, score: bucketScores[placeId]?.score, createdAt: new Date().toISOString() }, user)
    persist(next)
    if (user.isOwner) {
      const published: Record<string, number> = {}
      for (const [id, rank] of Object.entries(scores)) {
        if (typeof rank.score === 'number') published[id] = rank.score
      }
      localStorage.setItem(HOUSE_KEY, JSON.stringify(published))
      setHouse(published)
      if (remote) {
        const rows = Object.entries(published).map(([place_id, score]) => ({ place_id, score, updated_by: user.id }))
        if (rows.length) {
          void remote.from('house_scores').upsert(rows).then(({ error }) => {
            if (error) remoteError(error)
          })
        }
      }
    }
    setCompare(null)
    if (remote && bucketScores[placeId]) {
      void remote.from('rankings').upsert({ user_id: user.id, place_id: placeId, bucket, score: bucketScores[placeId].score }).then(({ error }) => {
        if (error) remoteError(error)
      })
    }
  }

  function startRank(placeId: string, bucket: Bucket) {
    if (!user) return
    const current = doc.order[bucket].filter((id) => id !== placeId)
    if (!current.length) {
      finishRank([placeId], bucket, placeId)
      return
    }
    setCompare({ placeId, bucket, low: 0, high: current.length })
  }

  function answerRank(choice: 'new' | 'old' | 'close' | 'skip') {
    if (!compare) return
    const current = doc.order[compare.bucket].filter((id) => id !== compare.placeId)
    if (choice === 'skip') {
      finishRank([...current, compare.placeId], compare.bucket, compare.placeId)
      return
    }
    const mid = Math.floor((compare.low + Math.min(compare.high, current.length)) / 2)
    const opponent = current[Math.min(mid, current.length - 1)]
    if (!opponent || choice === 'close') {
      const index = Math.min(mid + (choice === 'close' ? 1 : 0), current.length)
      const next = current.slice()
      next.splice(index, 0, compare.placeId)
      finishRank(next, compare.bucket, compare.placeId)
      return
    }
    if (choice === 'new') {
      if (compare.low >= mid) {
        const next = current.slice()
        next.splice(mid, 0, compare.placeId)
        finishRank(next, compare.bucket, compare.placeId)
        return
      }
      setCompare({ ...compare, high: mid })
      return
    }
    if (mid + 1 >= compare.high) {
      const next = current.slice()
      next.splice(mid + 1, 0, compare.placeId)
      finishRank(next, compare.bucket, compare.placeId)
      return
    }
    setCompare({ ...compare, low: mid + 1 })
  }

  function rememberMarks(next: Record<string, HouseMark>) {
    marksRef.current = next
    setMarks(next)
    localStorage.setItem(MARK_KEY, JSON.stringify(next))
  }

  function setHouseScore(placeId: string, score: number | null) {
    if (!user?.isOwner) return
    const next = { ...house }
    let value: number | null = null
    if (score != null) {
      value = Math.round(score * 10) / 10
      if (!Number.isFinite(value) || value < 0 || value > 10) return
      next[placeId] = value
    } else {
      delete next[placeId]
    }
    setHouse(next)
    localStorage.setItem(HOUSE_KEY, JSON.stringify(next))
    if (value != null && marksRef.current[placeId]) {
      const cleared = { ...marksRef.current }
      delete cleared[placeId]
      rememberMarks(cleared)
      if (remote) {
        void remote.from('house_marks').delete().eq('place_id', placeId).then(({ error }) => {
          if (error && !markTableMissing(error)) remoteError(error)
        })
      }
    }
    if (remote) {
      const write = value == null
        ? remote.from('house_scores').delete().eq('place_id', placeId)
        : remote.from('house_scores').upsert({ place_id: placeId, score: value, updated_by: user.id })
      void write.then(({ error }) => {
        if (error) remoteError(error)
      })
    }
  }

  function setHouseMark(placeId: string, status: HouseMark | null) {
    if (!user?.isOwner) return
    const next = { ...marksRef.current }
    if (status == null) delete next[placeId]
    else next[placeId] = status
    rememberMarks(next)
    if (!remote) return
    const write = status == null
      ? remote.from('house_marks').delete().eq('place_id', placeId)
      : remote.from('house_marks').upsert({ place_id: placeId, status, updated_by: user.id })
    void write.then(({ error }) => {
      if (!error) return
      if (markTableMissing(error)) {
        setAnnouncement("Haven't-been marks are saved on this device. Apply supabase/migrations/20261021013000_house_marks.sql so they stick to the account.")
        return
      }
      remoteError(error)
    })
  }

  function houseMark(placeId: string): HouseMark | null {
    return marks[placeId] ?? null
  }

  function rememberCollections(next: HouseCollection[]) {
    collectionsRef.current = next
    setCollections(next)
  }

  async function createCollection(city: CityId, title: string, blurb: string, placeIds: string[] = []): Promise<string | null> {
    if (!user?.isOwner) return null
    const nextTitle = cleanTitle(title)
    const nextBlurb = cleanBlurb(blurb)
    const problem = titleProblem(nextTitle, collectionsRef.current.filter((row) => row.city === city).map((row) => row.title)) ?? blurbProblem(nextBlurb)
    if (problem) {
      setAnnouncement(problem)
      return null
    }
    const slug = collectionSlug(nextTitle, collectionsRef.current.filter((row) => row.city === city).map((row) => row.slug))
    const position = collectionsRef.current.filter((row) => row.city === city).reduce((max, row) => Math.max(max, row.position), -1) + 1
    const tempId = crypto.randomUUID()
    const draft: HouseCollection = {
      id: tempId,
      city,
      title: nextTitle,
      slug,
      blurb: nextBlurb,
      position,
      placeIds: [...placeIds],
      published: false,
    }
    rememberCollections([...collectionsRef.current, draft])
    const status = collectionsStatusRef.current
    if (!remote || status === 'missing' || status === 'offline') {
      setAnnouncement(unpublishedNote(status === 'missing'))
      return tempId
    }
    const result = await insertCollection(remote, user.id, draft)
    if (!result.ok) {
      if (result.missing) {
        setCollectionsStatus('missing')
        setCollectionsMessage(unpublishedNote(true))
        setAnnouncement(unpublishedNote(true))
        return tempId
      }
      rememberCollections(collectionsRef.current.filter((row) => row.id !== tempId))
      setAnnouncement(result.message)
      return null
    }
    rememberCollections(collectionsRef.current.map((row) => (row.id === tempId ? { ...row, id: result.id, published: true } : row)))
    return result.id
  }

  async function renameCollection(id: string, title: string, blurb: string): Promise<boolean> {
    if (!user?.isOwner) return false
    const current = collectionsRef.current.find((row) => row.id === id)
    if (!current) return false
    const nextTitle = cleanTitle(title)
    const nextBlurb = cleanBlurb(blurb)
    const problem = titleProblem(
      nextTitle,
      collectionsRef.current.filter((row) => row.city === current.city).map((row) => row.title),
      current.title,
    ) ?? blurbProblem(nextBlurb)
    if (problem) {
      setAnnouncement(problem)
      return false
    }
    rememberCollections(collectionsRef.current.map((row) => (row.id === id ? { ...row, title: nextTitle, blurb: nextBlurb } : row)))
    if (!remote || !current.published) return true
    const result = await patchCollection(remote, user.id, id, { title: nextTitle, blurb: nextBlurb })
    if (result.ok) return true
    if (result.missing) {
      setCollectionsStatus('missing')
      rememberCollections(collectionsRef.current.map((row) => (row.id === id ? { ...row, published: false } : row)))
      setAnnouncement(unpublishedNote(true))
      return true
    }
    rememberCollections(collectionsRef.current.map((row) => (row.id === id ? current : row)))
    setAnnouncement(result.message)
    return false
  }

  async function deleteCollection(id: string) {
    if (!user?.isOwner) return
    const current = collectionsRef.current.find((row) => row.id === id)
    if (!current) return
    rememberCollections(collectionsRef.current.filter((row) => row.id !== id))
    if (!remote || !current.published) return
    const result = await removeCollection(remote, id)
    if (result.ok) return
    rememberCollections([...collectionsRef.current, current])
    if (result.missing) {
      setCollectionsStatus('missing')
      setAnnouncement(unpublishedNote(true))
      return
    }
    setAnnouncement(result.message)
  }

  function setCollectionPlace(collectionId: string, placeId: string, include: boolean) {
    if (!user?.isOwner) return
    const current = collectionsRef.current.find((row) => row.id === collectionId)
    if (!current) return
    const has = current.placeIds.includes(placeId)
    if (include === has) return
    const placeIds = include ? [...current.placeIds, placeId] : current.placeIds.filter((item) => item !== placeId)
    const previous = current.placeIds
    rememberCollections(collectionsRef.current.map((row) => (row.id === collectionId ? { ...row, placeIds } : row)))
    if (!remote || !current.published) return
    const write = include
      ? addCollectionPlace(remote, user.id, collectionId, placeId, Math.max(0, placeIds.length - 1))
      : removeCollectionPlace(remote, collectionId, placeId)
    void write.then((result) => {
      if (result.ok) return
      if (result.missing) {
        setCollectionsStatus('missing')
        rememberCollections(collectionsRef.current.map((row) => (row.id === collectionId ? { ...row, placeIds, published: false } : row)))
        setAnnouncement(unpublishedNote(true))
        return
      }
      rememberCollections(collectionsRef.current.map((row) => (row.id === collectionId ? { ...row, placeIds: previous } : row)))
      setAnnouncement(result.message)
    })
  }

  function reorderCollection(collectionId: string, placeIds: string[]) {
    if (!user?.isOwner) return
    const current = collectionsRef.current.find((row) => row.id === collectionId)
    if (!current) return
    const previous = current.placeIds
    rememberCollections(collectionsRef.current.map((row) => (row.id === collectionId ? { ...row, placeIds } : row)))
    if (!remote || !current.published) return
    void orderCollectionPlaces(remote, user.id, collectionId, placeIds).then((result) => {
      if (result.ok) return
      if (result.missing) {
        setCollectionsStatus('missing')
        rememberCollections(collectionsRef.current.map((row) => (row.id === collectionId ? { ...row, published: false } : row)))
        setAnnouncement(unpublishedNote(true))
        return
      }
      rememberCollections(collectionsRef.current.map((row) => (row.id === collectionId ? { ...row, placeIds: previous } : row)))
      setAnnouncement(result.message)
    })
  }

  async function uploadPhoto(placeId: string, file: File) {
    if (!user) throw new Error('Sign in first.')
    if (!user.isOwner && doc.statuses[placeId] !== 'been') throw new Error('Mark the place Been before adding a photo.')
    const image = await compressToWebp(file)
    const id = crypto.randomUUID()
    const record: StoredPhoto = {
      id,
      placeId,
      userId: user.id,
      userName: user.name,
      owner: user.isOwner,
      createdAt: new Date().toISOString(),
      width: image.width,
      height: image.height,
      blob: image.blob,
    }
    let url = ''
    let storagePath: string | undefined
    if (remote) {
      storagePath = `${user.id}/${placeId}/${id}.webp`
      url = await savePlacePhoto(remote, image.blob, storagePath, user.isOwner)
      const { error } = await remote.from('place_photos').insert({
        id,
        place_id: placeId,
        user_id: user.id,
        is_owner: user.isOwner,
        storage_path: storagePath,
        width: image.width,
        height: image.height,
      })
      if (error) throw error
    } else {
      await savePhoto(record)
      url = URL.createObjectURL(image.blob)
    }
    const publicOwner = url.includes('/object/public/owner-photos/')
    const live: LivePhoto = { ...record, url, storagePath, shareUrl: publicOwner ? url : undefined }
    if (remote && publicOwner) {
      setHousePhotos((current) => [live, ...current.filter((item) => item.id !== live.id)])
    } else {
      setPhotos((current) => [live, ...current])
    }
    const next = { ...doc }
    pushActivity(next, { id: crypto.randomUUID(), userId: user.id, type: 'photo', placeId, text: `Added a photo of ${placeName(placeId) ?? 'a place'}.`, createdAt: new Date().toISOString() }, user)
    persist(next)
  }

  async function deletePhoto(id: string) {
    const photo = photos.find((item) => item.id === id) ?? housePhotos.find((item) => item.id === id)
    await removePhoto(id)
    setPhotos((current) => current.filter((item) => item.id !== id))
    setHousePhotos((current) => current.filter((item) => item.id !== id))
    if (remote && photo?.storagePath) {
      await removePlacePhoto(remote, photo.storagePath, Boolean(photo.owner))
      await remote.from('place_photos').delete().eq('id', id)
    }
  }

  async function acceptImport() {
    if (!remote || !user || !importBundle.current) return
    const bundle = importBundle.current
    setAnnouncement('Moving places, guides, and photos into your account.')
    await importLocalBundle(remote, user, bundle)
    localStorage.setItem(`gusto.import.v1.${user.id}`, 'done')
    importBundle.current = null
    setImportOffer(null)
    const auth = await remote.auth.getUser()
    await hydrateRef.current(auth.data.user)
    setAnnouncement('Imported into your account.')
  }

  function dismissImport() {
    if (user) localStorage.setItem(`gusto.import.v1.${user.id}`, 'skip')
    importBundle.current = null
    setImportOffer(null)
  }

  const activities = useMemo(() => {
    const rows = remote || !demoFriendsEnabled ? doc.activities : [...doc.activities, ...demo.activities]
    return rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [doc.activities, remote])

  const plans = useMemo(() => {
    if (remote || !demoFriendsEnabled) return doc.plans
    const ids = new Set(doc.plans.map((plan) => plan.id))
    return [...doc.plans, ...demo.plans.filter((plan) => !ids.has(plan.id))]
  }, [doc.plans, remote])

  const guides = useMemo(() => {
    if (remote || !demoFriendsEnabled) return doc.guides
    const ids = new Set(doc.guides.map((guide) => guide.id))
    return [...doc.guides, ...demo.lists.filter((guide) => !ids.has(guide.id))]
  }, [doc.guides, remote])

  function friendScore(placeId: string) {
    if (!user) return { average: null, loved: 0, count: 0, demo: false }
    if (remote) {
      const values = doc.following
        .map((id) => friendRanks[id]?.[placeId])
        .filter((score): score is number => typeof score === 'number')
      if (!values.length) return { average: null, loved: 0, count: 0, demo: false }
      const loved = values.filter((score) => score >= 9).length
      const average = Math.round((values.reduce((sum, score) => sum + score, 0) / values.length) * 10) / 10
      return { average, loved, count: values.length, demo: false }
    }
    if (!demoFriendsEnabled) return { average: null, loved: 0, count: 0, demo: false }
    const followed = demo.users.filter((person) => doc.following.includes(person.id) && person.scores[placeId] !== undefined)
    if (!followed.length) return { average: null, loved: 0, count: 0, demo: false }
    const values = followed.map((person) => person.scores[placeId])
    const loved = values.filter((score) => score >= 9).length
    const average = Math.round((values.reduce((sum, score) => sum + score, 0) / values.length) * 10) / 10
    return { average, loved, count: followed.length, demo: true }
  }

  function friendMarks(placeId: string) {
    return friends.flatMap((person) => {
      const score = friendRanks[person.id]?.[placeId]
      return typeof score === 'number' ? [{ id: person.id, name: person.name, handle: person.handle, score }] : []
    })
  }

  function gustoScore(placeId: string): number | null {
    const value = house[placeId]
    return typeof value === 'number' ? value : null
  }

  function tasteMatch(userId: string) {
    const otherScores = remote || !demoFriendsEnabled ? friendRanks[userId] : demo.users.find((person) => person.id === userId)?.scores
    if (!otherScores) return null
    const keys = Object.keys(doc.scores).filter((id) => otherScores[id] !== undefined)
    if (keys.length < 3) return null
    const left = keys.map((id) => doc.scores[id].score)
    const right = keys.map((id) => otherScores[id])
    const mean = (list: number[]) => list.reduce((sum, n) => sum + n, 0) / list.length
    const ml = mean(left)
    const mr = mean(right)
    let num = 0
    let dl = 0
    let dr = 0
    for (let i = 0; i < keys.length; i += 1) {
      const a = left[i] - ml
      const b = right[i] - mr
      num += a * b
      dl += a * a
      dr += b * b
    }
    if (!dl || !dr) return null
    return Math.max(0, Math.round((num / Math.sqrt(dl * dr)) * 100))
  }

  const value: AppValue = {
    user,
    supabase: Boolean(remote),
    authProviders: providers,
    signIn,
    sendMagicLink: emailLink,
    signInProvider: providerSignIn,
    signOut,
    statuses: doc.statuses,
    setStatus,
    refresh: async () => {
      if (!remote) return
      await hydrateRef.current((await remote.auth.getUser()).data.user)
    },
    guides,
    createGuide,
    renameGuide,
    deleteGuide,
    addToGuide,
    removeFromGuide,
    moveInGuide,
    reorderGuide,
    setGuidePublic,
    setGuideVisibility,
    setGuideCover,
    setGuideLook,
    setPlaceNote,
    shareGuide,
    shareGuideByHandle,
    inviteLink,
    following: doc.following,
    toggleFollow,
    requestFriend,
    inviteByEmail,
    createFriendLink,
    respondFriend,
    friends,
    friendLists,
    requests,
    activities,
    toggleLike,
    likes: doc.likes,
    comments: doc.comments,
    addComment,
    plans,
    createPlan,
    votePlan,
    rsvpPlan,
    lockPlan,
    joinInvite,
    notices: doc.notices,
    markNoticesRead,
    scores: doc.scores,
    order: doc.order,
    compare,
    startRank,
    answerRank,
    photos: remote ? mergeUploads(housePhotos, photos) : photos,
    photosReady,
    uploadPhoto,
    deletePhoto,
    demoUsers: remote || !demoFriendsEnabled ? [] : demo.users,
    friendScore,
    friendMarks,
    gustoScore,
    houseScores: house,
    setHouseScore,
    houseMark,
    setHouseMark,
    collections,
    collectionsStatus,
    collectionsMessage,
    createCollection,
    renameCollection,
    deleteCollection,
    setCollectionPlace,
    reorderCollection,
    tasteMatch,
    announcement,
    authError,
    noteAuthFailure,
    clearAuthError,
    importOffer,
    acceptImport,
    dismissImport,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('useApp needs AppProvider')
  return value
}
