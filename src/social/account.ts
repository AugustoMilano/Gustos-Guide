import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { StoredPhoto } from '../lib/photos.ts'
import type { Activity, Bucket, Comment, GuideVisibility, Notice, Plan, RankScore, SessionUser, UserGuide, VisitStatus } from '../types.ts'
import type { LocalBundle } from './importLocal.ts'
import type { LivePhoto } from '../lib/gallery.ts'
import { ownerPhotoUrl, savePlacePhoto, signedPhotoUrl } from './supabase.ts'

export type FriendProfile = { id: string; name: string; handle: string; avatarUrl?: string }

type OwnProfile = { id: string; name: string; handle: string; is_owner: boolean; avatar_url?: string | null }

function claim(meta: Record<string, unknown>, key: string): string {
  const value = meta[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function xClaims(user: User): { name: string; handle: string; avatarUrl: string } | null {
  const fromX = user.app_metadata?.provider === 'x' || user.identities?.some((identity) => identity.provider === 'x')
  if (!fromX) return null
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const name = claim(meta, 'full_name') || claim(meta, 'name')
  const rawHandle = claim(meta, 'preferred_username') || claim(meta, 'user_name') || claim(meta, 'username')
  const handle = rawHandle.replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24)
  const avatarUrl = (claim(meta, 'avatar_url') || claim(meta, 'picture')).replace('_normal.', '_400x400.')
  if (!name && !handle && !avatarUrl) return null
  return { name, handle, avatarUrl }
}

async function loadOwnProfile(client: SupabaseClient, id: string) {
  const withAvatar = await client.from('profiles').select('id, name, handle, is_owner, avatar_url').eq('id', id).maybeSingle()
  if (!withAvatar.error || !/avatar_url|schema cache/i.test(withAvatar.error.message)) return withAvatar
  return client.from('profiles').select('id, name, handle, is_owner').eq('id', id).maybeSingle()
}

function generatedHandle(name: string, handle: string): boolean {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24)
  if (!handle || handle === 'guest') return true
  if (!base) return false
  return handle === base || (handle.startsWith(base.slice(0, 18)) && /\d+$/.test(handle))
}

async function applyXProfile(client: SupabaseClient, authUser: User, profile: OwnProfile): Promise<void> {
  const claims = xClaims(authUser)
  if (!claims) return
  const patch: { name?: string; handle?: string; avatar_url?: string } = {}
  if (claims.avatarUrl && (!profile.avatar_url || profile.avatar_url.includes('_normal.'))) patch.avatar_url = claims.avatarUrl
  if (claims.name && (!profile.name || profile.name === 'Guest')) patch.name = claims.name.slice(0, 80)
  if (claims.handle && generatedHandle(profile.name, profile.handle) && profile.handle !== claims.handle) patch.handle = claims.handle
  if (!patch.name && !patch.handle && !patch.avatar_url) return
  let { error } = await client.from('profiles').update(patch).eq('id', profile.id)
  if (error && /avatar_url|schema cache/i.test(error.message)) {
    delete patch.avatar_url
    if (!patch.name && !patch.handle) return
    const retry = await client.from('profiles').update(patch).eq('id', profile.id)
    error = retry.error
  }
  if (error?.code === '23505') {
    delete patch.handle
    if (!patch.name && !patch.avatar_url) return
    const retry = await client.from('profiles').update(patch).eq('id', profile.id)
    error = retry.error
  }
  if (error) return
  if (patch.name) profile.name = patch.name
  if (patch.handle) profile.handle = patch.handle
  if (patch.avatar_url) profile.avatar_url = patch.avatar_url
}
export type FriendRequest = { id: string; direction: 'in' | 'out'; name: string; handle: string }

export type AccountDoc = {
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

export type AccountSnapshot = {
  user: SessionUser
  doc: AccountDoc
  house: Record<string, number> | null
  photos: LivePhoto[]
  friends: FriendProfile[]
  requests: FriendRequest[]
  friendRanks: Record<string, Record<string, number>>
  friendLists: FriendLists
  counts: { places: number; guides: number; photos: number }
}

type GuideRow = {
  id: string
  owner_id: string
  title: string
  visibility: GuideVisibility
  cover_place_id: string | null
  invite_token: string | null
  emoji?: string | null
  accent?: string | null
}

type ItemRow = {
  guide_id: string
  place_id: string
  position: number
  note?: string | null
  added_at?: string | null
}

export type FriendLists = Record<string, { been: string[]; togo: string[] }>

function missingListColumn(error: { message?: string } | null): boolean {
  if (!error?.message) return false
  return /emoji|accent|note|added_at/i.test(error.message) && /column|schema cache/i.test(error.message)
}

async function selectGuides(client: SupabaseClient) {
  const rich = await client.from('guides').select('id, owner_id, title, visibility, cover_place_id, invite_token, emoji, accent')
  if (!rich.error || !missingListColumn(rich.error)) return rich
  return client.from('guides').select('id, owner_id, title, visibility, cover_place_id, invite_token')
}

async function selectGuideItems(client: SupabaseClient) {
  const rich = await client.from('guide_items').select('guide_id, place_id, position, note, added_at')
  if (!rich.error || !missingListColumn(rich.error)) return rich
  return client.from('guide_items').select('guide_id, place_id, position')
}

const buckets: Bucket[] = ['loved', 'liked', 'fine', 'didnt']

function blankOrder(): Record<Bucket, string[]> {
  return { loved: [], liked: [], fine: [], didnt: [] }
}

function orderFromScores(scores: Record<string, RankScore>): Record<Bucket, string[]> {
  const order = blankOrder()
  for (const [id, rank] of Object.entries(scores)) order[rank.bucket].push(id)
  for (const bucket of buckets) {
    order[bucket].sort((a, b) => (scores[b]?.score ?? 0) - (scores[a]?.score ?? 0))
  }
  return order
}

function schemaHint(error: { message?: string; code?: string } | null): Error | null {
  if (!error) return null
  if (error.code === '42P01' || /relation|schema cache|could not find the table/i.test(error.message ?? '')) {
    return new Error('Apply supabase/schema.sql in the Supabase SQL editor, then sign in again.')
  }
  return new Error(error.message || 'Could not reach your account.')
}

export function guideVisibility(guide: UserGuide): GuideVisibility {
  if (guide.visibility) return guide.visibility
  return guide.isPublic ? 'public' : 'private'
}

export async function loadOwnerPhotos(client: SupabaseClient): Promise<LivePhoto[]> {
  const { data, error } = await client.from('place_photos').select('id, place_id, user_id, storage_path, width, height').eq('is_owner', true)
  if (error || !data) return []
  const photos: LivePhoto[] = []
  for (const row of data) {
    const url = ownerPhotoUrl(row.storage_path)
    if (!url) continue
    photos.push({
      id: row.id,
      placeId: row.place_id,
      userId: row.user_id,
      userName: 'Gusto',
      owner: true,
      url,
      shareUrl: url,
      width: row.width ?? 1,
      height: row.height ?? 1,
      storagePath: row.storage_path,
    })
  }
  return photos
}

export async function loadHouseScores(client: SupabaseClient): Promise<Record<string, number> | null> {
  const { data, error } = await client.from('house_scores').select('place_id, score')
  if (error || !data) return null
  const house: Record<string, number> = {}
  for (const row of data) house[row.place_id] = Number(row.score)
  return house
}

export async function loadHouseMarks(client: SupabaseClient): Promise<Record<string, 'havent'> | null> {
  const { data, error } = await client.from('house_marks').select('place_id, status')
  if (error || !data) return null
  const marks: Record<string, 'havent'> = {}
  for (const row of data) {
    if (row.status === 'havent') marks[row.place_id] = 'havent'
  }
  return marks
}

export async function loadAccount(client: SupabaseClient, authUser: User): Promise<AccountSnapshot> {
  let profile: OwnProfile | null = null
  let lastError: { message?: string; code?: string } | null = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await loadOwnProfile(client, authUser.id)
    if (result.error) {
      lastError = result.error
      break
    }
    if (result.data) {
      profile = result.data
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  const hinted = schemaHint(lastError)
  if (hinted) throw hinted
  if (!profile) throw new Error('Your profile is not ready yet. Apply supabase/schema.sql, then open the sign-in link again.')
  await applyXProfile(client, authUser, profile)

  const user: SessionUser = {
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    isOwner: profile.is_owner,
    avatarUrl: profile.avatar_url || undefined,
  }

  const [statusRes, guideRes, itemRes, collabRes, planRes, memberRes, voteRes, activityRes, likeRes, commentRes, noticeRes, rankRes, photoRes, friendRes, house] = await Promise.all([
    client.from('place_status').select('place_id, status').eq('user_id', user.id),
    selectGuides(client),
    selectGuideItems(client),
    client.from('guide_collaborators').select('guide_id, user_id'),
    client.from('plans').select('id, host_id, title, place_ids, dates, locked, vibe, invite_token'),
    client.from('plan_members').select('plan_id, user_id, rsvp'),
    client.from('plan_votes').select('plan_id, user_id, place_id, vote_date, vote_time'),
    client.from('activities').select('id, user_id, type, place_id, list_id, list_title, body, score, created_at'),
    client.from('activity_likes').select('activity_id').eq('user_id', user.id),
    client.from('comments').select('id, activity_id, user_id, body, created_at'),
    client.from('notifications').select('id, body, href, read, created_at').order('created_at', { ascending: false }).limit(40),
    client.from('rankings').select('user_id, place_id, bucket, score'),
    client.from('place_photos').select('id, place_id, user_id, is_owner, storage_path, width, height'),
    client.from('friendships').select('id, requester_id, addressee_id, status, invite_email, invite_token'),
    loadHouseScores(client),
  ])

  for (const result of [statusRes, guideRes, itemRes, collabRes, planRes, memberRes, voteRes, activityRes, likeRes, commentRes, noticeRes, rankRes, photoRes, friendRes]) {
    const hintedResult = schemaHint(result.error)
    if (hintedResult) throw hintedResult
  }

  const statuses: Record<string, VisitStatus> = {}
  for (const row of statusRes.data ?? []) {
    if (row.status === 'togo' || row.status === 'been') statuses[row.place_id] = row.status
  }

  const items = new Map<string, ItemRow[]>()
  for (const row of (itemRes.data ?? []) as ItemRow[]) {
    const list = items.get(row.guide_id) ?? []
    list.push(row)
    items.set(row.guide_id, list)
  }
  const collaborators = new Map<string, string[]>()
  for (const row of collabRes.data ?? []) {
    const list = collaborators.get(row.guide_id) ?? []
    list.push(row.user_id)
    collaborators.set(row.guide_id, list)
  }
  const guides: UserGuide[] = ((guideRes.data ?? []) as GuideRow[]).map((row) => {
    const sorted = (items.get(row.id) ?? []).slice().sort((a, b) => a.position - b.position)
    const placeIds = sorted.map((item) => item.place_id)
    const notes: Record<string, string> = {}
    const addedAt: Record<string, string> = {}
    for (const item of sorted) {
      if (item.note) notes[item.place_id] = item.note
      if (item.added_at) addedAt[item.place_id] = item.added_at
    }
    const collaboratorIds = collaborators.get(row.id) ?? []
    return {
      id: row.id,
      title: row.title,
      placeIds,
      shared: row.visibility !== 'private' || collaboratorIds.length > 0,
      collaboratorIds,
      ownerId: row.owner_id,
      isPublic: row.visibility === 'public',
      visibility: row.visibility,
      coverPlaceId: row.cover_place_id ?? undefined,
      inviteToken: row.invite_token ?? undefined,
      emoji: row.emoji || undefined,
      color: row.accent || undefined,
      notes,
      addedAt,
    }
  })

  const members = new Map<string, { userId: string; rsvp: Plan['rsvps'][string] | null }[]>()
  for (const row of memberRes.data ?? []) {
    const list = members.get(row.plan_id) ?? []
    list.push({ userId: row.user_id, rsvp: row.rsvp })
    members.set(row.plan_id, list)
  }
  const votes = new Map<string, Plan['votes']>()
  for (const row of voteRes.data ?? []) {
    const bag = votes.get(row.plan_id) ?? {}
    bag[row.user_id] = {
      placeId: row.place_id ?? undefined,
      date: row.vote_date ?? undefined,
      time: row.vote_time ?? undefined,
    }
    votes.set(row.plan_id, bag)
  }
  const plans: Plan[] = (planRes.data ?? []).map((row) => {
    const people = members.get(row.id) ?? []
    const rsvps: Plan['rsvps'] = {}
    for (const person of people) if (person.rsvp) rsvps[person.userId] = person.rsvp
    return {
      id: row.id,
      title: row.title,
      hostId: row.host_id,
      placeIds: row.place_ids ?? [],
      dates: (row.dates ?? []).map((date: string) => String(date).slice(0, 10)),
      votes: votes.get(row.id) ?? {},
      rsvps,
      inviteIds: people.map((person) => person.userId).filter((id) => id !== row.host_id),
      locked: row.locked,
      vibe: row.vibe ?? undefined,
      inviteToken: row.invite_token ?? undefined,
    }
  })

  const activities: Activity[] = (activityRes.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    placeId: row.place_id ?? undefined,
    listId: row.list_id ?? undefined,
    listTitle: row.list_title ?? undefined,
    text: row.body ?? '',
    score: row.score === null || row.score === undefined ? undefined : Number(row.score),
    createdAt: row.created_at,
  }))

  const comments: Comment[] = (commentRes.data ?? []).map((row) => ({
    id: row.id,
    activityId: row.activity_id,
    userId: row.user_id,
    text: row.body,
    createdAt: row.created_at,
  }))

  const notices: Notice[] = (noticeRes.data ?? []).map((row) => ({
    id: row.id,
    text: row.body,
    href: row.href,
    read: row.read,
    createdAt: row.created_at,
  }))

  const scores: Record<string, RankScore> = {}
  const friendRanks: Record<string, Record<string, number>> = {}
  for (const row of rankRes.data ?? []) {
    const score = Number(row.score)
    if (row.user_id === user.id && buckets.includes(row.bucket)) {
      scores[row.place_id] = { bucket: row.bucket, score }
    } else {
      friendRanks[row.user_id] = friendRanks[row.user_id] ?? {}
      friendRanks[row.user_id][row.place_id] = score
    }
  }

  const friendRows = friendRes.data ?? []
  const otherIds = new Set<string>()
  for (const row of friendRows) {
    if (row.requester_id && row.requester_id !== user.id) otherIds.add(row.requester_id)
    if (row.addressee_id && row.addressee_id !== user.id) otherIds.add(row.addressee_id)
  }
  const photoRows = photoRes.data ?? []
  for (const row of photoRows) otherIds.add(row.user_id)
  const nameById = new Map<string, FriendProfile>()
  if (otherIds.size) {
    const { data: people } = await client.from('profiles').select('id, name, handle').in('id', [...otherIds])
    for (const person of people ?? []) nameById.set(person.id, person)
  }

  const friends: FriendProfile[] = []
  const requests: FriendRequest[] = []
  const following: string[] = []
  for (const row of friendRows) {
    const otherId = row.requester_id === user.id ? row.addressee_id : row.requester_id
    const other = otherId ? nameById.get(otherId) : undefined
    const name = other?.name ?? (row.invite_email ? row.invite_email : 'Friend')
    const handle = other?.handle ?? ''
    if (row.status === 'accepted' && other) {
      friends.push(other)
      following.push(other.id)
    } else if (row.status === 'pending') {
      requests.push({
        id: row.id,
        direction: row.requester_id === user.id ? 'out' : 'in',
        name,
        handle,
      })
    }
  }

  const photos = await Promise.all(
    photoRows.map(async (row) => {
      const shareUrl = row.is_owner ? ownerPhotoUrl(row.storage_path) : undefined
      const signed = await signedPhotoUrl(client, row.storage_path).catch(() => '')
      return {
        id: row.id,
        placeId: row.place_id,
        userId: row.user_id,
        userName: row.user_id === user.id ? user.name : nameById.get(row.user_id)?.name ?? 'Friend',
        owner: row.is_owner,
        url: signed || shareUrl || '',
        shareUrl,
        width: row.width ?? 1,
        height: row.height ?? 1,
        storagePath: row.storage_path,
      }
    }),
  )

  const friendLists: FriendLists = {}
  const friendStatus = await client.from('place_status').select('user_id, place_id, status')
  if (!friendStatus.error) {
    for (const row of friendStatus.data ?? []) {
      if (row.user_id === user.id) continue
      const status: 'been' | 'togo' | null = row.status === 'been' ? 'been' : row.status === 'togo' ? 'togo' : null
      if (!status) continue
      const bag = friendLists[row.user_id] ?? { been: [], togo: [] }
      bag[status].push(row.place_id)
      friendLists[row.user_id] = bag
    }
  }

  return {
    user,
    doc: {
      statuses,
      guides,
      following,
      activities,
      likes: (likeRes.data ?? []).map((row) => row.activity_id),
      comments,
      plans,
      notices,
      order: orderFromScores(scores),
      scores,
    },
    house,
    photos: photos.filter((photo) => photo.url),
    friends,
    requests,
    friendRanks,
    friendLists,
    counts: { places: Object.keys(statuses).length, guides: guides.filter((guide) => guide.ownerId === user.id).length, photos: photoRows.length },
  }
}

export async function loadPlans(client: SupabaseClient): Promise<Plan[]> {
  const [planRes, memberRes, voteRes] = await Promise.all([
    client.from('plans').select('id, host_id, title, place_ids, dates, locked, vibe, invite_token'),
    client.from('plan_members').select('plan_id, user_id, rsvp'),
    client.from('plan_votes').select('plan_id, user_id, place_id, vote_date, vote_time'),
  ])
  if (planRes.error) return []
  const members = new Map<string, { userId: string; rsvp: Plan['rsvps'][string] | null }[]>()
  for (const row of memberRes.data ?? []) {
    const list = members.get(row.plan_id) ?? []
    list.push({ userId: row.user_id, rsvp: row.rsvp })
    members.set(row.plan_id, list)
  }
  const votes = new Map<string, Plan['votes']>()
  for (const row of voteRes.data ?? []) {
    const bag = votes.get(row.plan_id) ?? {}
    bag[row.user_id] = { placeId: row.place_id ?? undefined, date: row.vote_date ?? undefined, time: row.vote_time ?? undefined }
    votes.set(row.plan_id, bag)
  }
  return (planRes.data ?? []).map((row) => {
    const people = members.get(row.id) ?? []
    const rsvps: Plan['rsvps'] = {}
    for (const person of people) if (person.rsvp) rsvps[person.userId] = person.rsvp
    return {
      id: row.id,
      title: row.title,
      hostId: row.host_id,
      placeIds: row.place_ids ?? [],
      dates: (row.dates ?? []).map((date: string) => String(date).slice(0, 10)),
      votes: votes.get(row.id) ?? {},
      rsvps,
      inviteIds: people.map((person) => person.userId).filter((id) => id !== row.host_id),
      locked: row.locked,
      vibe: row.vibe ?? undefined,
      inviteToken: row.invite_token ?? undefined,
    }
  })
}

export async function loadNotices(client: SupabaseClient): Promise<Notice[]> {
  const { data, error } = await client.from('notifications').select('id, body, href, read, created_at').order('created_at', { ascending: false }).limit(40)
  if (error || !data) return []
  return data.map((row) => ({ id: row.id, text: row.body, href: row.href, read: row.read, createdAt: row.created_at }))
}

async function mirrorList(client: SupabaseClient, userId: string, guide: UserGuide): Promise<void> {
  const visibility = guideVisibility(guide)
  const shared = visibility !== 'private' || guide.collaboratorIds.length > 0
  if (!shared) {
    await client.from('lists').delete().eq('id', guide.id).eq('owner_id', userId)
    return
  }
  const { error } = await client.from('lists').upsert({
    id: guide.id,
    owner_id: userId,
    title: guide.title,
    shared: true,
    visibility,
    invite_token: guide.inviteToken ?? null,
  })
  if (error) throw error
  await client.from('list_places').delete().eq('list_id', guide.id)
  if (guide.placeIds.length) {
    const { error: placeError } = await client.from('list_places').insert(
      guide.placeIds.map((placeId, position) => ({ list_id: guide.id, place_id: placeId, position })),
    )
    if (placeError) throw placeError
  }
  await client.from('list_collaborators').delete().eq('list_id', guide.id)
  if (guide.collaboratorIds.length) {
    const { error: collabError } = await client.from('list_collaborators').insert(
      guide.collaboratorIds.map((id) => ({ list_id: guide.id, user_id: id })),
    )
    if (collabError) throw collabError
  }
}

export async function saveGuide(client: SupabaseClient, userId: string, guide: UserGuide): Promise<void> {
  const visibility = guideVisibility(guide)
  const mine = (guide.ownerId || userId) === userId
  if (mine) {
    const row = {
      id: guide.id,
      owner_id: userId,
      title: guide.title,
      visibility,
      cover_place_id: guide.coverPlaceId ?? null,
      invite_token: guide.inviteToken ?? null,
      emoji: guide.emoji ?? null,
      accent: guide.color ?? null,
    }
    let { error } = await client.from('guides').upsert(row)
    if (error && missingListColumn(error)) {
      const { emoji: _emoji, accent: _accent, ...plain } = row
      const retry = await client.from('guides').upsert(plain)
      error = retry.error
    }
    if (error) throw error
    await client.from('guide_collaborators').delete().eq('guide_id', guide.id)
    if (guide.collaboratorIds.length) {
      const { error: collabError } = await client.from('guide_collaborators').insert(
        guide.collaboratorIds.map((id) => ({ guide_id: guide.id, user_id: id })),
      )
      if (collabError) throw collabError
    }
    await mirrorList(client, userId, guide)
  }
  await client.from('guide_items').delete().eq('guide_id', guide.id)
  if (guide.placeIds.length) {
    const rows = guide.placeIds.map((placeId, position) => ({
      guide_id: guide.id,
      place_id: placeId,
      position,
      note: guide.notes?.[placeId] ?? null,
      added_at: guide.addedAt?.[placeId] ?? null,
    }))
    let { error: itemError } = await client.from('guide_items').insert(rows)
    if (itemError && missingListColumn(itemError)) {
      const plain = rows.map(({ note: _note, added_at: _added, ...item }) => item)
      const retry = await client.from('guide_items').insert(plain)
      itemError = retry.error
    }
    if (itemError) throw itemError
  }
}

export async function deleteGuideRemote(client: SupabaseClient, guideId: string): Promise<void> {
  const { error } = await client.from('guides').delete().eq('id', guideId)
  if (error) throw error
  await client.from('lists').delete().eq('id', guideId)
}

export async function savePlan(client: SupabaseClient, userId: string, plan: Plan): Promise<void> {
  const hostId = plan.hostId || userId
  if (hostId === userId) {
    const { error } = await client.from('plans').upsert({
      id: plan.id,
      host_id: userId,
      title: plan.title,
      place_ids: plan.placeIds,
      dates: plan.dates,
      locked: Boolean(plan.locked),
      vibe: plan.vibe ?? null,
      invite_token: plan.inviteToken ?? null,
    })
    if (error) throw error
    const memberIds = [userId, ...plan.inviteIds.filter((id) => id !== userId)]
    const { error: memberError } = await client.from('plan_members').upsert(
      memberIds.map((id) => ({ plan_id: plan.id, user_id: id, rsvp: plan.rsvps[id] ?? null })),
    )
    if (memberError) throw memberError
  } else if (plan.rsvps[userId]) {
    const { error } = await client.from('plan_members').upsert({ plan_id: plan.id, user_id: userId, rsvp: plan.rsvps[userId] })
    if (error) throw error
  }
  const mine = plan.votes[userId]
  if (mine && (mine.placeId || mine.date || mine.time)) {
    const { error } = await client.from('plan_votes').upsert({
      plan_id: plan.id,
      user_id: userId,
      place_id: mine.placeId ?? null,
      vote_date: mine.date || null,
      vote_time: mine.time || null,
    })
    if (error) throw error
  }
}

export async function importLocalBundle(client: SupabaseClient, user: SessionUser, bundle: LocalBundle): Promise<void> {
  for (const [placeId, status] of Object.entries(bundle.statuses)) {
    const { error } = await client.from('place_status').upsert({ user_id: user.id, place_id: placeId, status })
    if (error) throw error
  }
  for (const guide of bundle.guides) {
    const next: UserGuide = {
      ...guide,
      id: crypto.randomUUID(),
      ownerId: user.id,
      demo: false,
      collaboratorIds: [],
      shared: false,
      inviteToken: crypto.randomUUID().slice(0, 8),
      visibility: guide.visibility ?? (guide.isPublic ? 'public' : 'private'),
      isPublic: guide.visibility === 'public' || guide.isPublic === true,
    }
    await saveGuide(client, user.id, next)
  }
  for (const photo of bundle.photos) {
    await uploadImportedPhoto(client, user, photo)
  }
}

async function uploadImportedPhoto(client: SupabaseClient, user: SessionUser, photo: StoredPhoto): Promise<void> {
  const id = crypto.randomUUID()
  const path = `${user.id}/${photo.placeId}/${id}.webp`
  await savePlacePhoto(client, photo.blob, path, user.isOwner)
  const { error } = await client.from('place_photos').insert({
    id,
    place_id: photo.placeId,
    user_id: user.id,
    is_owner: photo.owner,
    storage_path: path,
    width: photo.width,
    height: photo.height,
  })
  if (error) throw error
}
