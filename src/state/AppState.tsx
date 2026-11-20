import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { CityId } from '../lib/city.ts'
import {
  blurbProblem,
  cleanBlurb,
  cleanTitle,
  collectionSlug,
  seattleCheapEatsBlocked,
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
import { HOUSE_SCORE_FALLBACK } from '../lib/house-score-fallback.ts'
import { fetchOwnerSession, hasOwnerHint, ownerLogin, ownerLogout } from '../lib/owner-session.ts'
import type { HouseMark } from '../lib/quick-score.ts'
import { clearAvatar, deleteGuideRemote, loadGuideById, importLocalBundle, loadAccount, loadHouseScores, loadNotices, loadPerson, loadPlans, saveAvatar, saveGuide, savePlan, saveProfile as saveProfileRemote, searchPeople as searchPeopleRemote, suggestPeople as suggestPeopleRemote, type FriendLists, type FriendProfile, type FriendRequest, type PersonView } from '../social/account.ts'
import {
  addCollectionPlace,
  insertCollection,
  orderCollectionPlaces,
  patchCollection,
  removeCollection,
  removeCollectionPlace,
  unpublishedNote,
} from '../social/collection-store.ts'
import { scanLocalBundle, type LocalBundle } from '../social/importLocal.ts'
import { authProviders, loadSupabase, removePlacePhoto, savePlacePhoto, sendMagicLink, signInWithProvider, supabaseClient, supabaseConfigured, verifyEmailCode } from '../social/supabase.ts'
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

/** What moved from this phone's old name-only sign-in into the account, shown once on the welcome sheet. */
export type ImportedNote = { places: number; guides: number; photos: number; ranks: number; plans: number }

const OWNER_LOCAL_ID = 'local-augusto'

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
  /** True when this build has real accounts (Supabase URL and key were set at build time). */
  accounts: boolean
  verifyEmailCode: (email: string, code: string) => Promise<void>
  /** A new account still has to pick its display name and username. */
  needsProfile: boolean
  imported: ImportedNote | null
  saveProfile: (name: string, handle: string) => Promise<void>
  skipProfile: () => void
  /** Owner status checked by the server (/api/owner/session). Never comes from an account. */
  ownerSignedIn: boolean
  ownerChecked: boolean
  ownerConfigured: boolean
  ownerSignIn: (password: string) => Promise<void>
  ownerSignOut: () => Promise<void>
  checkOwner: () => Promise<void>
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
  /** False until the house-score read has settled. A missing score is not "unrated" before that. */
  houseReady: boolean
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
  /** Taste match against scores that were loaded for a profile page. */
  tasteMatchWith: (otherScores: Record<string, number>) => number | null
  searchPeople: (query: string) => Promise<FriendProfile[]>
  suggestPeople: () => Promise<FriendProfile[]>
  loadPerson: (handle: string) => Promise<PersonView | null>
  /** A list that is not one of yours (a friend's or a public one), read when its page opens. */
  loadList: (id: string) => Promise<UserGuide | null>
  setAvatar: (image: { blob: Blob; dataUrl: string } | null) => Promise<void>
  /** Saves that did not reach the account. Shown on screen with Retry until they go through. */
  saveFailure: SaveFailure | null
  retrySaves: () => Promise<void>
  /** Re-read friends and requests, e.g. after someone accepts on their own phone. Throttled. */
  refreshFriends: (force?: boolean) => void
  dismissSaveFailure: () => void
  announcement: string
  authError: string | null
  noteAuthFailure: (message: string) => void
  clearAuthError: () => void
  importOffer: ImportOffer | null
  acceptImport: () => Promise<void>
  dismissImport: () => void
}

export type SaveFailure = { count: number; what: string; message: string; retrying: boolean }

type FailedSave = { what: string; message: string; run: () => Promise<void> }

/** A Supabase write resolves with { error } instead of throwing. Turn that into a throw. */
async function settle(write: PromiseLike<{ error: unknown } | void> | Promise<unknown>): Promise<void> {
  const result = await write
  if (result && typeof result === 'object' && 'error' in result && (result as { error: unknown }).error) throw (result as { error: unknown }).error
}

function failureText(error: unknown): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'You look offline.'
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') return (error as { message: string }).message
  return 'The account did not answer.'
}

const Ctx = createContext<AppValue | null>(null)

function emptyDoc(): Doc {
  const live = supabaseConfigured
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

/** House data is not read from or written to Supabase on this build. */
function houseRemote(): SupabaseClient | null {
  return null
}

/** The owner's on-device session from the password sign-in, if this browser has one. */
function ownerLocalSession(): SessionUser | null {
  if (!hasOwnerHint()) return null
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') as SessionUser | null
    if (session && session.id === OWNER_LOCAL_ID) return { ...session, isOwner: false }
  } catch {
    /* empty */
  }
  return null
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
  const [remote, setRemote] = useState<SupabaseClient | null>(() => supabaseClient())
  useEffect(() => {
    if (!supabaseConfigured || remote) return
    let live = true
    void loadSupabase().then((client) => { if (live) setRemote(client) })
    return () => { live = false }
  }, [remote])
  const providers = useMemo(() => authProviders(), [])
  const [baseUser, setUser] = useState<SessionUser | null>(null)
  // Owner comes only from the server-checked HttpOnly cookie, never from a typed name, localStorage,
  // or an account. Accounts (Supabase) are for visitors' own lists, ranks, friends, and plans.
  const [ownerVerified, setOwnerVerified] = useState(false)
  const [ownerChecked, setOwnerChecked] = useState(false)
  const [ownerConfigured, setOwnerConfigured] = useState(false)
  const user = useMemo<SessionUser | null>(() => {
    if (!baseUser) return null
    // Owner rights come only from the HttpOnly cookie set by /api/owner/login. An account's
    // profiles.is_owner is ignored here, so no visitor account can become the owner.
    const isOwner = ownerVerified
    return baseUser.isOwner === isOwner ? baseUser : { ...baseUser, isOwner }
  }, [baseUser, ownerVerified])
  const [doc, setDoc] = useState<Doc>(emptyDoc)
  const [photos, setPhotos] = useState<LivePhoto[]>([])
  const [devicePhotos, setDevicePhotos] = useState<LivePhoto[]>([])
  const [photosReady, setPhotosReady] = useState(false)
  const [compare, setCompare] = useState<Compare | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [authError, setAuthError] = useState<string | null>(() => peekAuthError())
  const [house, setHouse] = useState<Record<string, number>>({})
  const [published, setPublished] = useState<Record<string, number>>({})
  const [houseReady, setHouseReady] = useState(!supabaseConfigured)
  const [marks, setMarks] = useState<Record<string, HouseMark>>({})
  const [collections, setCollections] = useState<HouseCollection[]>([])
  const collectionsRef = useRef<HouseCollection[]>([])
  // Published Gusto's Scores are read from the public house_scores table so every visitor sees them.
  // Owner drafts stay on this device. Accounts never write house scores, marks, or collections.
  const [collectionsStatus, setCollectionsStatus] = useState<CollectionsStatus>('offline')

  useEffect(() => {
    if (!remote) {
      if (!supabaseConfigured) setHouseReady(true)
      return
    }
    let cancel = false
    void loadHouseScores(remote).then((scores) => {
      if (cancel) return
      if (scores) setPublished(scores)
      setHouseReady(true)
    }).catch(() => {
      if (!cancel) setHouseReady(true)
    })
    return () => { cancel = true }
  }, [remote])

  const collectionsStatusRef = useRef(collectionsStatus)
  const [collectionsMessage, setCollectionsMessage] = useState('')
  const marksRef = useRef(marks)
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [friendRanks, setFriendRanks] = useState<Record<string, Record<string, number>>>({})
  const [friendLists, setFriendLists] = useState<FriendLists>({})
  const [importOffer, setImportOffer] = useState<ImportOffer | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [imported, setImported] = useState<ImportedNote | null>(null)
  const importBundle = useRef<LocalBundle | null>(null)
  const generation = useRef(0)
  const hydrateRef = useRef<(authUser: User | null) => Promise<void>>(async () => {})

  function remoteError(error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not save that.'
    setAnnouncement(message)
  }

  // Failed writes, keyed so a later save of the same list/plan/place replaces the older attempt.
  const failedSaves = useRef(new Map<string, FailedSave>())
  const [saveFailure, setSaveFailure] = useState<SaveFailure | null>(null)

  function showFailures(retrying = false) {
    const all = [...failedSaves.current.values()]
    if (!all.length) {
      setSaveFailure(null)
      return
    }
    const latest = all[all.length - 1]
    setSaveFailure({ count: all.length, what: latest.what, message: latest.message, retrying })
  }

  /** Run an account write. If it fails, keep it and show it on screen with Retry. Never silent. */
  function track(key: string, what: string, run: () => Promise<void>) {
    void run().then(() => {
      if (failedSaves.current.delete(key)) showFailures()
    }).catch((error: unknown) => {
      failedSaves.current.delete(key)
      failedSaves.current.set(key, { what, message: failureText(error), run })
      setAnnouncement(`Your ${what} did not save.`)
      showFailures()
    })
  }

  async function retrySaves() {
    const jobs = [...failedSaves.current.entries()]
    if (!jobs.length) return
    showFailures(true)
    for (const [key, job] of jobs) {
      try {
        await job.run()
        if (failedSaves.current.get(key) === job) failedSaves.current.delete(key)
      } catch (error) {
        if (failedSaves.current.get(key) === job) failedSaves.current.set(key, { ...job, message: failureText(error) })
      }
    }
    showFailures()
    if (!failedSaves.current.size) setAnnouncement('Saved.')
  }

  function dismissSaveFailure() {
    setSaveFailure(null)
  }

  async function hydrate(authUser: User | null) {
    if (!remote) return
    const ticket = ++generation.current
    if (!authUser) {
      // Signed out of an account. The owner's on-device session (password sign-in) still applies.
      const owner = ownerLocalSession()
      setUser(owner)
      setDoc(owner ? loadDoc(owner.id) : emptyDoc())
      setNeedsProfile(false)
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
      let snap = await loadAccount(remote, authUser)
      if (ticket !== generation.current) return
      // First sign-in on a phone that used the old name-only sign-in: move everything into the
      // account right away, so nobody loses lists. Runs once per account per browser; a failed move
      // picks up where it stopped on the next load.
      const bundle = await scanLocalBundle(snap.user.id)
      if (ticket !== generation.current) return
      if (bundle) {
        const flag = `gusto.import.v1.${snap.user.id}`
        localStorage.setItem(flag, `running:${Date.now()}`)
        try {
          const note = await importLocalBundle(remote, snap.user, bundle)
          localStorage.setItem(flag, 'done')
          setImported(note)
          setAnnouncement('Moved what this phone had saved into your account.')
          snap = await loadAccount(remote, authUser)
          if (ticket !== generation.current) return
        } catch (error) {
          // Leave the phone's copy untouched and try again on the next sign-in.
          localStorage.removeItem(flag)
          remoteError(error)
        }
      }
      setUser(snap.user)
      setDoc(snap.doc)
      setPhotos(snap.photos)
      setFriends(snap.friends)
      setRequests(snap.requests)
      setFriendRanks(snap.friendRanks)
      setFriendLists(snap.friendLists)
      localStorage.setItem(`gusto.doc.v1.${snap.user.id}`, JSON.stringify(snap.doc))
      importBundle.current = null
      setImportOffer(null)
      const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>
      let skipped = false
      try { skipped = sessionStorage.getItem(`gusto.profile.skip.${snap.user.id}`) === '1' } catch { /* storage off */ }
      setNeedsProfile(meta.profile_set !== true && !skipped)
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
    let live = true
    let stop = () => {}
    void import('../content/load.ts').then(async (mod) => {
      await mod.catalogReady
      if (!live) return
      const take = () => {
        for (const place of mod.catalog.places) placeNames.set(place.id, place.name)
      }
      take()
      stop = mod.subscribeCatalog(take)
    })
    return () => {
      live = false
      stop()
    }
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
    // On-device house scores and marks are the owner's drafts. Only a server-verified owner sees them,
    // so a visitor who once typed his name does not keep a fake Gusto's Score in this browser.
    if (!ownerVerified) {
      setHouse({})
      marksRef.current = {}
      setMarks({})
      return
    }
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
  }, [ownerVerified])

  useEffect(() => {
    if (supabaseConfigured) {
      // Accounts build: the old name-only session is not a sign-in any more (its lists move into the
      // account on first email sign-in). Only the owner's password session keeps its device data.
      if (baseUser) return
      const owner = ownerLocalSession()
      if (owner) {
        setUser(owner)
        setDoc(loadDoc(owner.id))
      }
      return
    }
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return
    try {
      const session = JSON.parse(raw) as SessionUser
      if (!session || typeof session.id !== 'string') return
      setUser({ ...session, isOwner: false })
      setDoc(loadDoc(session.id))
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote])

  const checkOwner = useCallback(async () => {
    const session = await fetchOwnerSession()
    setOwnerVerified(session.owner)
    setOwnerConfigured(session.configured)
    setOwnerChecked(true)
  }, [])

  useEffect(() => {
    // Ordinary visitors never call the endpoint on load; only a browser that signed in as owner before.
    if (!hasOwnerHint()) return
    void checkOwner()
  }, [checkOwner])

  async function ownerSignIn(password: string) {
    await ownerLogin(password)
    await checkOwner()
    try { localStorage.setItem('gg_owner', '1') } catch { /* storage off */ }
    // Signed in to an account too: keep it. Owner rights ride on the cookie either way.
    if (baseUser && !baseUser.id.startsWith('local-')) {
      setAnnouncement('Signed in as the owner.')
      return
    }
    // Keep his existing on-device data (it was saved under local-augusto).
    const session: SessionUser = { id: OWNER_LOCAL_ID, name: 'Augusto', handle: 'augusto', isOwner: false }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    setDoc(loadDoc(session.id))
    setAnnouncement('Signed in as the owner.')
  }

  async function ownerSignOut() {
    await ownerLogout()
    setOwnerVerified(false)
    setAnnouncement('Owner signed out.')
  }

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
    // Photos saved on this device (the owner's house shots, and visitors' photos from before accounts).
    let cancelled = false
    const urls: string[] = []
    void readPhotos().then((rows) => {
      if (cancelled) return
      const live = rows.map((row) => {
        const url = URL.createObjectURL(row.blob)
        urls.push(url)
        return { ...row, url }
      })
      if (supabaseConfigured) setDevicePhotos(live)
      else setPhotos(live)
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
      refreshFriends(true)
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

  const friendsRefreshedAt = useRef(0)
  function refreshFriends(force = false) {
    if (!remote || !user) return
    const now = Date.now()
    if (!force && now - friendsRefreshedAt.current < 15_000) return
    friendsRefreshedAt.current = now
    void remote.auth.getUser().then(({ data }) => {
      if (!data.user || data.user.id !== user.id) return
      return loadAccount(remote, data.user).then((snap) => {
        setFriends(snap.friends)
        setRequests(snap.requests)
        setFriendRanks(snap.friendRanks)
        setFriendLists(snap.friendLists)
      })
    }).catch(() => { /* next focus tries again */ })
  }

  useEffect(() => {
    if (!remote || !user) return
    const onShow = () => { if (document.visibilityState === 'visible') refreshFriends() }
    document.addEventListener('visibilitychange', onShow)
    window.addEventListener('focus', onShow)
    return () => {
      document.removeEventListener('visibilitychange', onShow)
      window.removeEventListener('focus', onShow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote, user])

  function persist(next: Doc, session = user) {
    setDoc(next)
    if (session) localStorage.setItem(`gusto.doc.v1.${session.id}`, JSON.stringify(next))
  }

  function pushGuide(guide: UserGuide | undefined, session = user) {
    if (!remote || !session || !guide || guide.demo) return
    track(`guide:${guide.id}`, 'list', () => saveGuide(remote, session.id, guide))
  }

  function pushPlan(plan: Plan | undefined, session = user) {
    if (!remote || !session || !plan || plan.demo) return
    track(`plan:${plan.id}`, 'plan', () => savePlan(remote, session.id, plan))
  }

  function pushActivity(next: Doc, activity: Activity, session: SessionUser) {
    next.activities = [activity, ...next.activities]
    if (!remote) return
    track(`activity:${activity.id}`, 'feed post', () => settle(remote.from('activities').insert({
      id: activity.id,
      user_id: session.id,
      type: activity.type,
      place_id: activity.placeId,
      list_id: activity.listId,
      list_title: activity.listTitle,
      body: activity.text,
      score: activity.score,
    })))
  }

  function pushNotice(notice: Notice, session = user) {
    if (!remote || !session) return
    track(`notice:${notice.id}`, 'notification', () => settle(remote.from('notifications').insert({
      id: notice.id,
      user_id: session.id,
      body: notice.text,
      href: notice.href,
      read: notice.read,
    })))
  }

  async function signIn(name: string) {
    const trimmed = name.trim()
    if (!trimmed || remote || supabaseConfigured) return
    const session: SessionUser = {
      id: `local-${handleOf(trimmed)}`,
      name: trimmed,
      handle: handleOf(trimmed),
      isOwner: false,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setUser(session)
    setDoc(loadDoc(session.id))
    setAnnouncement(`Signed in as ${trimmed}.`)
  }

  async function emailLink(email: string) {
    const client = remote ?? await loadSupabase()
    if (!client) throw new Error('Supabase is not configured.')
    await sendMagicLink(client, email)
    setAnnouncement('Check your email for a sign-in link.')
  }

  async function emailCode(email: string, code: string) {
    const client = remote ?? await loadSupabase()
    if (!client) throw new Error('Sign-in is not available right now.')
    await verifyEmailCode(client, email, code)
    setAnnouncement('Signed in.')
  }

  async function saveProfile(name: string, handle: string) {
    if (!remote || !user || user.id.startsWith('local-')) throw new Error('Sign in first.')
    const saved = await saveProfileRemote(remote, user.id, name, handle)
    const { error } = await remote.auth.updateUser({ data: { profile_set: true } })
    if (error) throw error
    setUser((current) => (current && current.id === user.id ? { ...current, name: saved.name, handle: saved.handle } : current))
    setNeedsProfile(false)
    setImported(null)
    setAnnouncement(`Profile saved. You are @${saved.handle}.`)
  }

  async function setAvatar(image: { blob: Blob; dataUrl: string } | null) {
    if (!remote || !user || user.id.startsWith('local-')) throw new Error('Sign in first.')
    const id = user.id
    let url: string | undefined
    if (image) url = await saveAvatar(remote, id, image)
    else await clearAvatar(remote, id)
    setUser((current) => (current && current.id === id ? { ...current, avatarUrl: url } : current))
    setAnnouncement(image ? 'Profile photo saved.' : 'Profile photo removed.')
  }

  function skipProfile() {
    if (user) {
      try { sessionStorage.setItem(`gusto.profile.skip.${user.id}`, '1') } catch { /* storage off */ }
    }
    setNeedsProfile(false)
    setImported(null)
  }

  async function providerSignIn(provider: 'apple' | 'google' | 'x') {
    const client = remote ?? await loadSupabase()
    if (!client) throw new Error('Supabase is not configured.')
    if (!providers.includes(provider)) throw new Error('That sign-in is not turned on.')
    await signInWithProvider(client, provider)
  }

  function signOut() {
    if (remote) void remote.auth.signOut()
    localStorage.removeItem(SESSION_KEY)
    if (ownerVerified) void ownerSignOut()
    setUser(null)
    setDoc(emptyDoc())
    setNeedsProfile(false)
    setImported(null)
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
      const userId = user.id
      track(`status:${placeId}`, turningOff ? 'place mark' : status === 'been' ? 'Been mark' : 'To go save', () => settle(turningOff
        ? remote.from('place_status').delete().eq('user_id', userId).eq('place_id', placeId)
        : remote.from('place_status').upsert({ user_id: userId, place_id: placeId, status })))
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
    if (remote) track(`guide:${id}`, 'list delete', () => deleteGuideRemote(remote, id))
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
    if (supabaseConfigured) return
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
    // Same answer whether or not that address already has an account, so an invite never tells
    // anyone who is signed up. Before migration.sql the server returns no token for a member;
    // a plain friend link stands in so the screen still looks the same.
    let token = typeof data === 'string' && data ? data : ''
    if (!token) {
      const link = await remote.rpc('create_friend_link')
      token = typeof link.data === 'string' ? link.data : ''
    }
    await hydrateRef.current((await remote.auth.getUser()).data.user)
    setAnnouncement('Invite link ready.')
    return token ? canonicalUrl(`#/join/${token}`) : ''
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
      const userId = user.id
      const liked = likes.includes(activityId)
      track(`like:${activityId}`, 'like', () => settle(liked
        ? remote.from('activity_likes').upsert({ activity_id: activityId, user_id: userId })
        : remote.from('activity_likes').delete().eq('activity_id', activityId).eq('user_id', userId)))
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
      const userId = user.id
      track(`comment:${comment.id}`, 'comment', () => settle(remote.from('comments').insert({ id: comment.id, activity_id: activityId, user_id: userId, body: comment.text })))
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
    }
    setCompare(null)
    if (remote && bucketScores[placeId]) {
      const row = { user_id: user.id, place_id: placeId, bucket, score: bucketScores[placeId].score }
      track(`rank:${placeId}`, 'rating', () => settle(remote.from('rankings').upsert(row)))
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
    }
  }

  function setHouseMark(placeId: string, status: HouseMark | null) {
    if (!user?.isOwner) return
    const next = { ...marksRef.current }
    if (status == null) delete next[placeId]
    else next[placeId] = status
    rememberMarks(next)
  }

  function houseMark(placeId: string): HouseMark | null {
    return marks[placeId] ?? null
  }

  function rememberCollections(next: HouseCollection[]) {
    collectionsRef.current = next
    setCollections(next)
  }

  // House collections never write through an account (see collectionsStatus above).
  const houseClient = houseRemote()

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
    if (!houseClient || status === 'missing' || status === 'offline') {
      setAnnouncement(unpublishedNote(status === 'missing'))
      return tempId
    }
    const result = await insertCollection(houseClient, user.id, draft)
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
    if (!houseClient || !current.published) return true
    const result = await patchCollection(houseClient, user.id, id, { title: nextTitle, blurb: nextBlurb })
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
    if (!houseClient || !current.published) return
    const result = await removeCollection(houseClient, id)
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
    if (include && seattleCheapEatsBlocked(current.city, current.slug, placeId)) return
    const has = current.placeIds.includes(placeId)
    if (include === has) return
    const placeIds = include ? [...current.placeIds, placeId] : current.placeIds.filter((item) => item !== placeId)
    const previous = current.placeIds
    rememberCollections(collectionsRef.current.map((row) => (row.id === collectionId ? { ...row, placeIds } : row)))
    if (!houseClient || !current.published) return
    const write = include
      ? addCollectionPlace(houseClient, user.id, collectionId, placeId, Math.max(0, placeIds.length - 1))
      : removeCollectionPlace(houseClient, collectionId, placeId)
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
    if (!houseClient || !current.published) return
    void orderCollectionPlaces(houseClient, user.id, collectionId, placeIds).then((result) => {
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
    // House (owner) shots stay on this device exactly as before; only visitor accounts upload.
    const toAccount = Boolean(remote) && !user.isOwner && !user.id.startsWith('local-')
    if (remote && toAccount) {
      storagePath = `${user.id}/${placeId}/${id}.webp`
      url = await savePlacePhoto(remote, image.blob, storagePath, false)
      const { error } = await remote.from('place_photos').insert({
        id,
        place_id: placeId,
        user_id: user.id,
        is_owner: false,
        storage_path: storagePath,
        width: image.width,
        height: image.height,
      })
      if (error) throw error
    } else {
      await savePhoto(record)
      url = URL.createObjectURL(image.blob)
    }
    const live: LivePhoto = { ...record, url, storagePath }
    if (supabaseConfigured && !toAccount) setDevicePhotos((current) => [live, ...current])
    else setPhotos((current) => [live, ...current])
    const next = { ...doc }
    pushActivity(next, { id: crypto.randomUUID(), userId: user.id, type: 'photo', placeId, text: `Added a photo of ${placeName(placeId) ?? 'a place'}.`, createdAt: new Date().toISOString() }, user)
    persist(next)
  }

  async function deletePhoto(id: string) {
    const photo = photos.find((item) => item.id === id) ?? devicePhotos.find((item) => item.id === id)
    await removePhoto(id)
    setPhotos((current) => current.filter((item) => item.id !== id))
    setDevicePhotos((current) => current.filter((item) => item.id !== id))
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
    if (ownerVerified) {
      const draft = house[placeId]
      if (typeof draft === 'number') return draft
    }
    const live = published[placeId]
    if (typeof live === 'number') return live
    const fallback = HOUSE_SCORE_FALLBACK[placeId]
    return typeof fallback === 'number' ? fallback : null
  }

  function tasteMatch(userId: string) {
    const otherScores = remote || !demoFriendsEnabled ? friendRanks[userId] : demo.users.find((person) => person.id === userId)?.scores
    return tasteMatchWith(otherScores ?? null)
  }

  function tasteMatchWith(otherScores: Record<string, number> | null) {
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
    accounts: supabaseConfigured,
    verifyEmailCode: emailCode,
    needsProfile,
    imported,
    saveProfile,
    skipProfile,
    ownerSignedIn: ownerVerified,
    ownerChecked,
    ownerConfigured,
    ownerSignIn,
    ownerSignOut,
    checkOwner,
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
    // Local mode: house (owner) uploads on this device only show to the server-verified owner.
    // House (owner) uploads saved on this device only show to the server-verified owner.
    photos: supabaseConfigured
      ? mergeUploads(ownerVerified ? devicePhotos.filter((photo) => photo.owner) : [], photos)
      : ownerVerified ? photos : photos.filter((photo) => !photo.owner),
    photosReady,
    uploadPhoto,
    deletePhoto,
    demoUsers: remote || !demoFriendsEnabled ? [] : demo.users,
    friendScore,
    friendMarks,
    gustoScore,
    houseReady,
    houseScores: ownerVerified ? { ...published, ...house } : published,
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
    tasteMatchWith: (other: Record<string, number>) => tasteMatchWith(other),
    searchPeople: async (query: string) => {
      if (!remote || !user || user.id.startsWith('local-')) return []
      return searchPeopleRemote(remote, query, user.id)
    },
    suggestPeople: async () => {
      if (!remote || !user || user.id.startsWith('local-')) return []
      const skip = [...friends.map((person) => person.id)]
      return suggestPeopleRemote(remote, user.id, skip)
    },
    loadPerson: async (handle: string) => {
      const client = remote ?? await loadSupabase()
      if (!client) return null
      return loadPerson(client, handle)
    },
    loadList: async (id: string) => {
      const client = remote ?? await loadSupabase()
      if (!client) return null
      return loadGuideById(client, id)
    },
    setAvatar,
    saveFailure,
    retrySaves,
    refreshFriends,
    dismissSaveFailure,
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
