import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import demoFile from '../content/demo.json'
import { catalog } from '../content/load.ts'
import { compressToWebp, readPhotos, removePhoto, savePhoto, type StoredPhoto } from '../lib/photos.ts'
import { rescore } from '../lib/rank.ts'
import { supabaseClient, uploadPlacePhoto } from '../social/supabase.ts'
import type { Activity, Bucket, Comment, Notice, Plan, RankScore, SessionUser, UserGuide, VisitStatus } from '../types.ts'

type DemoUser = {
  id: string
  name: string
  handle: string
  demo: true
  neighborhood: string
  streak: number
  scores: Record<string, number>
  been: string[]
}

type DemoFile = {
  users: DemoUser[]
  activities: Activity[]
  lists: UserGuide[]
  plans: Plan[]
}

const demo = demoFile as DemoFile
const SESSION_KEY = 'gusto.session.v1'
const HOUSE_KEY = 'gusto.house.v1'

export type LivePhoto = {
  id: string
  placeId: string
  userId: string
  userName: string
  owner: boolean
  url: string
  width: number
  height: number
}

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
  signIn: (name: string) => Promise<void>
  signInEmail: (email: string, password: string, create: boolean) => Promise<void>
  signOut: () => void
  statuses: Record<string, VisitStatus>
  setStatus: (placeId: string, status: VisitStatus) => void
  guides: UserGuide[]
  createGuide: (title: string) => void
  renameGuide: (id: string, title: string) => void
  deleteGuide: (id: string) => void
  addToGuide: (guideId: string, placeId: string) => void
  removeFromGuide: (guideId: string, placeId: string) => void
  moveInGuide: (guideId: string, placeId: string, direction: -1 | 1) => void
  reorderGuide: (guideId: string, placeIds: string[]) => void
  setGuidePublic: (guideId: string, isPublic: boolean) => void
  setGuideCover: (guideId: string, placeId: string) => void
  shareGuide: (guideId: string, collaboratorId: string) => void
  inviteLink: (kind: 'guide' | 'plan', id: string) => string
  following: string[]
  toggleFollow: (userId: string) => void
  activities: Activity[]
  toggleLike: (activityId: string) => void
  likes: string[]
  comments: Comment[]
  addComment: (activityId: string, text: string) => void
  plans: Plan[]
  createPlan: (title: string, placeIds: string[], dates: string[], options?: { vibe?: string; votePlaceId?: string; locked?: boolean }) => string
  votePlan: (planId: string, placeId: string, date: string) => void
  rsvpPlan: (planId: string, rsvp: 'yes' | 'no' | 'maybe') => void
  lockPlan: (planId: string) => void
  joinInvite: (token: string) => 'guide' | 'plan' | null
  notices: Notice[]
  markNoticesRead: () => void
  scores: Record<string, RankScore>
  order: Record<Bucket, string[]>
  compare: Compare | null
  startRank: (placeId: string, bucket: Bucket) => void
  answerRank: (choice: 'new' | 'old' | 'close' | 'skip') => void
  photos: LivePhoto[]
  uploadPhoto: (placeId: string, file: File) => Promise<void>
  deletePhoto: (id: string) => Promise<void>
  demoUsers: DemoUser[]
  friendScore: (placeId: string) => { average: number | null; loved: number; count: number; demo: boolean }
  gustoScore: (placeId: string) => number | null
  tasteMatch: (userId: string) => number | null
  announcement: string
}

const Ctx = createContext<AppValue | null>(null)

function emptyDoc(): Doc {
  return {
    statuses: {},
    guides: [],
    following: demo.users.map((user) => user.id),
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
  const [user, setUser] = useState<SessionUser | null>(null)
  const [doc, setDoc] = useState<Doc>(emptyDoc)
  const [photos, setPhotos] = useState<LivePhoto[]>([])
  const [compare, setCompare] = useState<Compare | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [house, setHouse] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HOUSE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, number>
      if (parsed && typeof parsed === 'object') setHouse(parsed)
    } catch {
      setHouse({})
    }
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw || remote) return
    const session = JSON.parse(raw) as SessionUser
    setUser(session)
    setDoc(loadDoc(session.id))
  }, [remote])

  useEffect(() => {
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
    })
    return () => {
      cancelled = true
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [])

  function persist(next: Doc, session = user) {
    setDoc(next)
    if (session) localStorage.setItem(`gusto.doc.v1.${session.id}`, JSON.stringify(next))
  }

  function pushActivity(next: Doc, activity: Activity, session: SessionUser) {
    next.activities = [activity, ...next.activities]
    if (!remote) return
    void remote.from('activities').insert({
      id: activity.id,
      user_id: session.id,
      type: activity.type,
      place_id: activity.placeId,
      list_title: activity.listTitle,
      body: activity.text,
      score: activity.score,
    })
  }

  async function signIn(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
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

  async function signInEmail(email: string, password: string, create: boolean) {
    if (!remote) throw new Error('Supabase is not configured.')
    const result = create
      ? await remote.auth.signUp({ email, password })
      : await remote.auth.signInWithPassword({ email, password })
    if (result.error) throw result.error
    const authUser = result.data.user
    if (!authUser) throw new Error('No session came back.')
    const name = email.split('@')[0] ?? 'Guest'
    await remote.from('profiles').upsert({ id: authUser.id, name, handle: handleOf(name), is_owner: ownerName(name) })
    const session: SessionUser = { id: authUser.id, name, handle: handleOf(name), isOwner: ownerName(name) }
    setUser(session)
    setAnnouncement(`Signed in as ${name}.`)
  }

  function signOut() {
    if (remote) void remote.auth.signOut()
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setDoc(emptyDoc())
    setCompare(null)
  }

  function setStatus(placeId: string, status: VisitStatus) {
    if (!user) return
    const next = { ...doc, statuses: { ...doc.statuses } }
    const turningOff = next.statuses[placeId] === status
    if (turningOff) delete next.statuses[placeId]
    else next.statuses[placeId] = status
    const place = catalog.places.find((item) => item.id === placeId)
    pushActivity(
      next,
      {
        id: crypto.randomUUID(),
        userId: user.id,
        type: status === 'been' ? 'been' : 'saved',
        placeId,
        text: turningOff ? `Cleared ${place?.name ?? 'a place'}.` : `${status === 'been' ? 'Been' : 'Saved'} ${place?.name ?? 'a place'}.`,
        createdAt: new Date().toISOString(),
      },
      user,
    )
    persist(next)
    if (remote) {
      if (turningOff) void remote.from('place_status').delete().eq('user_id', user.id).eq('place_id', placeId)
      else void remote.from('place_status').upsert({ user_id: user.id, place_id: placeId, status })
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
      inviteToken: crypto.randomUUID().slice(0, 8),
    }
    const next = { ...doc, guides: [guide, ...doc.guides] }
    pushActivity(next, { id: crypto.randomUUID(), userId: user.id, type: 'list', listId: guide.id, listTitle: guide.title, text: `Started ${guide.title}.`, createdAt: new Date().toISOString() }, user)
    persist(next)
  }

  function renameGuide(id: string, title: string) {
    persist({ ...doc, guides: doc.guides.map((guide) => (guide.id === id ? { ...guide, title } : guide)) })
  }

  function deleteGuide(id: string) {
    persist({ ...doc, guides: doc.guides.filter((guide) => guide.id !== id) })
  }

  function addToGuide(guideId: string, placeId: string) {
    persist({
      ...doc,
      guides: doc.guides.map((guide) =>
        guide.id === guideId && !guide.placeIds.includes(placeId) ? { ...guide, placeIds: [...guide.placeIds, placeId] } : guide,
      ),
    })
  }

  function removeFromGuide(guideId: string, placeId: string) {
    persist({
      ...doc,
      guides: doc.guides.map((guide) => (guide.id === guideId ? { ...guide, placeIds: guide.placeIds.filter((id) => id !== placeId) } : guide)),
    })
  }

  function moveInGuide(guideId: string, placeId: string, direction: -1 | 1) {
    persist({
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
    })
  }

  function reorderGuide(guideId: string, placeIds: string[]) {
    if (!user) return
    persist({
      ...doc,
      guides: doc.guides.map((guide) => (guide.id === guideId ? { ...guide, placeIds } : guide)),
    })
  }

  function setGuidePublic(guideId: string, isPublic: boolean) {
    if (!user) return
    persist({
      ...doc,
      guides: doc.guides.map((guide) => (guide.id === guideId ? { ...guide, isPublic } : guide)),
    })
  }

  function setGuideCover(guideId: string, placeId: string) {
    if (!user) return
    persist({
      ...doc,
      guides: doc.guides.map((guide) => (guide.id === guideId ? { ...guide, coverPlaceId: placeId } : guide)),
    })
  }

  function shareGuide(guideId: string, collaboratorId: string) {
    if (!user) return
    const next = {
      ...doc,
      guides: doc.guides.map((guide) =>
        guide.id === guideId
          ? { ...guide, shared: true, collaboratorIds: guide.collaboratorIds.includes(collaboratorId) ? guide.collaboratorIds : [...guide.collaboratorIds, collaboratorId] }
          : guide,
      ),
    }
    const guide = next.guides.find((item) => item.id === guideId)
    pushActivity(next, { id: crypto.randomUUID(), userId: user.id, type: 'list', listId: guideId, listTitle: guide?.title, text: `Shared ${guide?.title ?? 'a list'}.`, createdAt: new Date().toISOString() }, user)
    persist(next)
  }

  function toggleFollow(userId: string) {
    const following = doc.following.includes(userId) ? doc.following.filter((id) => id !== userId) : [...doc.following, userId]
    persist({ ...doc, following })
  }

  function toggleLike(activityId: string) {
    if (!user) return
    const likes = doc.likes.includes(activityId) ? doc.likes.filter((id) => id !== activityId) : [...doc.likes, activityId]
    persist({ ...doc, likes })
    if (remote) {
      if (likes.includes(activityId)) void remote.from('activity_likes').upsert({ activity_id: activityId, user_id: user.id })
      else void remote.from('activity_likes').delete().eq('activity_id', activityId).eq('user_id', user.id)
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
    if (remote) void remote.from('activity_comments').insert({ id: comment.id, activity_id: activityId, user_id: user.id, body: comment.text })
  }

  function createPlan(
    title: string,
    placeIds: string[],
    dates: string[],
    options?: { vibe?: string; votePlaceId?: string; locked?: boolean },
  ) {
    if (!user) return ''
    const plan: Plan = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Go together',
      hostId: user.id,
      placeIds,
      dates,
      votes: options?.votePlaceId ? { [user.id]: { placeId: options.votePlaceId, date: dates[0] } } : {},
      rsvps: { [user.id]: 'yes' },
      inviteIds: demo.users.map((person) => person.id),
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
    persist({
      ...doc,
      plans: doc.plans.map((item) => (item.id === planId ? { ...item, locked: true } : item)),
      notices: [notice, ...doc.notices].slice(0, 40),
    })
  }

  function inviteLink(kind: 'guide' | 'plan', id: string) {
    if (kind === 'plan') {
      const plan = doc.plans.find((item) => item.id === id)
      const token = plan?.inviteToken || plan?.id || id
      return `${window.location.origin}${window.location.pathname}#/join/${token}`
    }
    const guide = [...doc.guides, ...demo.lists].find((item) => item.id === id)
    const token = guide?.inviteToken || guide?.id || id
    return `${window.location.origin}${window.location.pathname}#/join/${token}`
  }

  function markNoticesRead() {
    persist({ ...doc, notices: doc.notices.map((notice) => ({ ...notice, read: true })) })
  }

  function joinInvite(token: string): 'guide' | 'plan' | null {
    if (!user) return null
    const guide = [...doc.guides, ...demo.lists].find((item) => item.inviteToken === token || item.id === token)
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
    const plan = [...doc.plans, ...demo.plans].find((item) => item.inviteToken === token || item.id === token)
    if (!plan) return null
    const base = doc.plans.find((item) => item.id === plan.id) ?? plan
    const nextPlan: Plan = { ...base, rsvps: { ...base.rsvps, [user.id]: 'yes' } }
    persist({ ...doc, plans: [nextPlan, ...doc.plans.filter((item) => item.id !== plan.id)] })
    return 'plan'
  }

  function votePlan(planId: string, placeId: string, date: string) {
    if (!user) return
    const apply = (plan: Plan): Plan =>
      plan.id === planId ? { ...plan, votes: { ...plan.votes, [user.id]: { placeId, date } } } : plan
    persist({ ...doc, plans: doc.plans.map(apply) })
  }

  function rsvpPlan(planId: string, rsvp: 'yes' | 'no' | 'maybe') {
    if (!user) return
    persist({
      ...doc,
      plans: doc.plans.map((plan) => (plan.id === planId ? { ...plan, rsvps: { ...plan.rsvps, [user.id]: rsvp } } : plan)),
    })
  }

  function finishRank(nextOrder: string[], bucket: Bucket, placeId: string) {
    if (!user) return
    const order = { ...doc.order, [bucket]: nextOrder }
    const bucketScores = rescore(bucket, nextOrder)
    const scores = { ...doc.scores }
    for (const id of Object.keys(scores)) if (scores[id].bucket === bucket && !nextOrder.includes(id)) delete scores[id]
    Object.assign(scores, bucketScores)
    const next = { ...doc, order, scores }
    const place = catalog.places.find((item) => item.id === placeId)
    pushActivity(next, { id: crypto.randomUUID(), userId: user.id, type: 'rated', placeId, text: `Ranked ${place?.name ?? 'a place'}.`, score: bucketScores[placeId]?.score, createdAt: new Date().toISOString() }, user)
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
      void remote.from('rankings').upsert({ user_id: user.id, place_id: placeId, bucket, score: bucketScores[placeId].score })
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

  async function uploadPhoto(placeId: string, file: File) {
    if (!user) throw new Error('Sign in first.')
    if (doc.statuses[placeId] !== 'been') throw new Error('Mark the place Been before adding a photo.')
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
    await savePhoto(record)
    let url = URL.createObjectURL(image.blob)
    if (remote) {
      const path = `${user.id}/${placeId}/${id}.webp`
      url = await uploadPlacePhoto(remote, image.blob, path)
      await remote.from('place_photos').insert({
        id,
        place_id: placeId,
        user_id: user.id,
        is_owner: user.isOwner,
        storage_path: path,
        width: image.width,
        height: image.height,
      })
    }
    setPhotos((current) => [{ ...record, url }, ...current])
    const place = catalog.places.find((item) => item.id === placeId)
    const next = { ...doc }
    pushActivity(next, { id: crypto.randomUUID(), userId: user.id, type: 'photo', placeId, text: `Added a photo of ${place?.name ?? 'a place'}.`, createdAt: new Date().toISOString() }, user)
    persist(next)
  }

  async function deletePhoto(id: string) {
    await removePhoto(id)
    setPhotos((current) => current.filter((photo) => photo.id !== id))
  }

  const activities = useMemo(() => {
    return [...doc.activities, ...demo.activities].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [doc.activities])

  const plans = useMemo(() => {
    const ids = new Set(doc.plans.map((plan) => plan.id))
    return [...doc.plans, ...demo.plans.filter((plan) => !ids.has(plan.id))]
  }, [doc.plans])
  const guides = useMemo(() => {
    const ids = new Set(doc.guides.map((guide) => guide.id))
    return [...doc.guides, ...demo.lists.filter((guide) => !ids.has(guide.id))]
  }, [doc.guides])

  function friendScore(placeId: string) {
    if (!user || remote) return { average: null, loved: 0, count: 0, demo: false }
    const followed = demo.users.filter((person) => doc.following.includes(person.id) && person.scores[placeId] !== undefined)
    if (!followed.length) return { average: null, loved: 0, count: 0, demo: true }
    const values = followed.map((person) => person.scores[placeId])
    const loved = values.filter((score) => score >= 9).length
    const average = Math.round((values.reduce((sum, score) => sum + score, 0) / values.length) * 10) / 10
    return { average, loved, count: followed.length, demo: true }
  }

  function gustoScore(placeId: string): number | null {
    const value = house[placeId]
    return typeof value === 'number' ? value : null
  }

  function tasteMatch(userId: string) {
    const other = demo.users.find((person) => person.id === userId)
    if (!other) return null
    const keys = Object.keys(doc.scores).filter((id) => other.scores[id] !== undefined)
    if (keys.length < 3) return null
    const left = keys.map((id) => doc.scores[id].score)
    const right = keys.map((id) => other.scores[id])
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
    signIn,
    signInEmail,
    signOut,
    statuses: doc.statuses,
    setStatus,
    guides,
    createGuide,
    renameGuide,
    deleteGuide,
    addToGuide,
    removeFromGuide,
    moveInGuide,
    reorderGuide,
    setGuidePublic,
    setGuideCover,
    shareGuide,
    inviteLink,
    following: doc.following,
    toggleFollow,
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
    photos,
    uploadPhoto,
    deletePhoto,
    demoUsers: demo.users,
    friendScore,
    gustoScore,
    tasteMatch,
    announcement,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('useApp needs AppProvider')
  return value
}
