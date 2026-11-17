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

export function givenNameFromAuth(user: User): string | undefined {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const value = claim(meta, 'given_name') || claim(meta, 'givenName') || claim(meta, 'first_name') || claim(meta, 'firstName')
  return value || undefined
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
export const HANDLE_RULE = /^[a-z0-9_]{3,24}$/

export function cleanHandle(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase()
}

/** Name and username from the welcome sheet or Edit profile. Only these columns are writable. */
export async function saveProfile(client: SupabaseClient, id: string, rawName: string, rawHandle: string): Promise<{ name: string; handle: string }> {
  const name = rawName.trim().replace(/\s+/g, ' ').slice(0, 80)
  const handle = cleanHandle(rawHandle)
  if (!name) throw new Error('Add a display name.')
  if (!HANDLE_RULE.test(handle)) throw new Error('Usernames are 3 to 24 letters, numbers, or underscores.')
  const { error } = await client.from('profiles').update({ name, handle }).eq('id', id)
  if (error?.code === '23505') throw new Error(`@${handle} is taken. Try another.`)
  if (error) throw new Error(error.message || 'Could not save your profile.')
  return { name, handle }
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

/**
 * Lists this account owns or edits. Public lists from everyone else are not read at sign-in; a
 * profile page loads that person's lists when it opens (loadPerson).
 */
function scopeGuides<T extends { or: (filter: string) => T }>(query: T, scope: GuideScope): T {
  const ids = scope.extraIds.filter((id) => /^[0-9a-f-]{36}$/i.test(id))
  return query.or(ids.length ? `owner_id.eq.${scope.ownerId},id.in.(${ids.join(',')})` : `owner_id.eq.${scope.ownerId}`)
}

type GuideScope = { ownerId: string; extraIds: string[] }

async function selectGuidesRaw(client: SupabaseClient, withToken: boolean, scope: GuideScope) {
  const token = withToken ? ', invite_token' : ''
  const rich = await scopeGuides(client.from('guides').select(`id, owner_id, title, visibility, cover_place_id${token}, emoji, accent`), scope)
  if (!rich.error || !missingListColumn(rich.error)) return rich
  return scopeGuides(client.from('guides').select(`id, owner_id, title, visibility, cover_place_id${token}`), scope)
}

/**
 * After migration.sql, invite tokens are no longer readable on public guides (anyone holding one can
 * edit). my_guide_invites() returns tokens only for guides this person owns or edits. Before the
 * migration that function does not exist, so the old column read is used.
 */
async function selectGuides(client: SupabaseClient, scope: GuideScope) {
  const invites = await client.rpc('my_guide_invites')
  if (invites.error) return selectGuidesRaw(client, true, scope)
  const res = await selectGuidesRaw(client, false, scope)
  if (res.error || !res.data) return res
  const tokens = new Map<string, string>()
  for (const row of (invites.data ?? []) as { guide_id: string; invite_token: string | null }[]) {
    if (row.invite_token) tokens.set(row.guide_id, row.invite_token)
  }
  return { ...res, data: (res.data as unknown as GuideRow[]).map((row) => ({ ...row, invite_token: tokens.get(row.id) ?? null })) }
}

async function selectGuideItems(client: SupabaseClient, guideIds: string[]) {
  if (!guideIds.length) return { data: [] as ItemRow[], error: null }
  const rich = await client.from('guide_items').select('guide_id, place_id, position, note, added_at').in('guide_id', guideIds)
  if (!rich.error || !missingListColumn(rich.error)) return rich
  return client.from('guide_items').select('guide_id, place_id, position').in('guide_id', guideIds)
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
  const { data, error } = await client
    .from('place_photos')
    .select('id, place_id, user_id, storage_path, width, height, created_at')
    .eq('is_owner', true)
    .order('created_at', { ascending: false })
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
    // Owner rights never come from an account on this build; see AppState (password cookie only).
    isOwner: false,
    avatarUrl: profile.avatar_url || undefined,
    givenName: givenNameFromAuth(authUser),
  }

  // Only lists this account owns or edits. Everyone's public lists used to come down here at every
  // sign-in; a profile page now loads one person's lists when it opens.
  const myCollabs = await client.from('guide_collaborators').select('guide_id').eq('user_id', user.id)
  const hintedCollab = schemaHint(myCollabs.error)
  if (hintedCollab) throw hintedCollab
  const scope: GuideScope = { ownerId: user.id, extraIds: [...new Set((myCollabs.data ?? []).map((row) => String(row.guide_id)))] }
  const guideRes = await selectGuides(client, scope)
  const hintedGuides = schemaHint(guideRes.error)
  if (hintedGuides) throw hintedGuides
  const guideIds = ((guideRes.data ?? []) as GuideRow[]).map((row) => row.id)
  const [statusRes, itemRes, collabRes, planRes, memberRes, voteRes, activityRes, likeRes, commentRes, noticeRes, rankRes, photoRes, friendRes] = await Promise.all([
    client.from('place_status').select('place_id, status').eq('user_id', user.id),
    selectGuideItems(client, guideIds),
    guideIds.length ? client.from('guide_collaborators').select('guide_id, user_id').in('guide_id', guideIds) : Promise.resolve({ data: [] as { guide_id: string; user_id: string }[], error: null }),
    client.from('plans').select('id, host_id, title, place_ids, dates, locked, vibe, invite_token'),
    client.from('plan_members').select('plan_id, user_id, rsvp'),
    client.from('plan_votes').select('plan_id, user_id, place_id, vote_date, vote_time'),
    client.from('activities').select('id, user_id, type, place_id, list_id, list_title, body, score, created_at'),
    client.from('activity_likes').select('activity_id').eq('user_id', user.id),
    client.from('comments').select('id, activity_id, user_id, body, created_at'),
    client.from('notifications').select('id, body, href, read, created_at').order('created_at', { ascending: false }).limit(40),
    client.from('rankings').select('user_id, place_id, bucket, score'),
    // House (owner) photos ship with the site; accounts only carry their own and friends' photos.
    client.from('place_photos').select('id, place_id, user_id, is_owner, storage_path, width, height').eq('is_owner', false),
    client.from('friendships').select('id, requester_id, addressee_id, status, invite_email, invite_token'),
  ])
  const house = null

  for (const result of [statusRes, itemRes, collabRes, planRes, memberRes, voteRes, activityRes, likeRes, commentRes, noticeRes, rankRes, photoRes, friendRes]) {
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
    const { data: people } = await client.from('profiles').select('id, name, handle, avatar_url').in('id', [...otherIds])
    for (const person of (people ?? []) as PersonRow[]) nameById.set(person.id, asFriend(person))
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
    counts: { places: Object.keys(statuses).length, guides: guides.filter((guide) => guide.ownerId === user.id).length, photos: photoRows.filter((row) => row.user_id === user.id).length },
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

/**
 * Insert, or update when the row already exists. Not upsert: on an upsert Postgres also checks the
 * new row against the SELECT policy, and guides/plans/lists decide visibility with functions that
 * cannot see a row that is still being inserted, so every first save of a list or plan was refused.
 * A plain insert with no returned row only checks the INSERT policy.
 */
async function insertOrUpdate(client: SupabaseClient, table: string, row: Record<string, unknown> & { id: string }) {
  const inserted = await client.from(table).insert(row)
  if (inserted.error?.code !== '23505') return inserted
  const { id, ...patch } = row
  return client.from(table).update(patch).eq('id', id)
}

async function mirrorList(client: SupabaseClient, userId: string, guide: UserGuide): Promise<void> {
  const visibility = guideVisibility(guide)
  const shared = visibility !== 'private' || guide.collaboratorIds.length > 0
  if (!shared) {
    await client.from('lists').delete().eq('id', guide.id).eq('owner_id', userId)
    return
  }
  const { error } = await insertOrUpdate(client, 'lists', {
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
    let { error } = await insertOrUpdate(client, 'guides', row)
    if (error && missingListColumn(error)) {
      const { emoji: _emoji, accent: _accent, ...plain } = row
      const retry = await insertOrUpdate(client, 'guides', plain)
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
    const { error } = await insertOrUpdate(client, 'plans', {
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

/** Same account + same phone item always maps to the same row id, so a resumed move never duplicates. */
async function stableId(userId: string, localId: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`gusto-import:${userId}:${localId}`))).slice(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function importProgress(userId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(`gusto.import.items.v1.${userId}`) || '[]') as string[])
  } catch {
    return new Set()
  }
}

function markImported(userId: string, done: Set<string>, key: string) {
  done.add(key)
  try { localStorage.setItem(`gusto.import.items.v1.${userId}`, JSON.stringify([...done])) } catch { /* storage off */ }
}

/**
 * Moves what the old name-only sign-in kept on this phone into the account. Safe to run again after
 * a failure: places and ranks are upserts, and each list, plan, and photo is remembered once moved.
 */
export async function importLocalBundle(client: SupabaseClient, user: SessionUser, bundle: LocalBundle): Promise<{ places: number; guides: number; photos: number; ranks: number; plans: number }> {
  const done = importProgress(user.id)
  for (const guide of bundle.guides) {
    const key = `guide:${guide.id}`
    if (done.has(key)) continue
    const next: UserGuide = {
      ...guide,
      id: await stableId(user.id, `guide:${guide.id}`),
      ownerId: user.id,
      demo: false,
      collaboratorIds: [],
      shared: false,
      inviteToken: crypto.randomUUID().slice(0, 8),
      visibility: guide.visibility ?? (guide.isPublic ? 'public' : 'private'),
      isPublic: guide.visibility === 'public' || guide.isPublic === true,
    }
    await saveGuide(client, user.id, next)
    markImported(user.id, done, key)
  }
  const statusRows = Object.entries(bundle.statuses).map(([placeId, status]) => ({ user_id: user.id, place_id: placeId, status }))
  if (statusRows.length) {
    const { error } = await client.from('place_status').upsert(statusRows)
    if (error) throw error
  }
  const rankRows = Object.entries(bundle.scores).map(([placeId, rank]) => ({ user_id: user.id, place_id: placeId, bucket: rank.bucket, score: Math.max(0, Math.min(10, rank.score)) }))
  if (rankRows.length) {
    const { error } = await client.from('rankings').upsert(rankRows)
    if (error) throw error
  }
  for (const plan of bundle.plans) {
    const key = `plan:${plan.id}`
    if (done.has(key)) continue
    const mine = plan.votes[plan.hostId]
    await savePlan(client, user.id, {
      ...plan,
      id: await stableId(user.id, `plan:${plan.id}`),
      hostId: user.id,
      demo: false,
      // Name-only friends had no accounts, so nobody else can be carried over.
      inviteIds: [],
      votes: mine ? { [user.id]: mine } : {},
      rsvps: plan.rsvps[plan.hostId] ? { [user.id]: plan.rsvps[plan.hostId] } : {},
      inviteToken: crypto.randomUUID().slice(0, 8),
    })
    markImported(user.id, done, key)
  }
  for (const photo of bundle.photos) {
    const key = `photo:${photo.id}`
    if (done.has(key)) continue
    await uploadImportedPhoto(client, user, photo)
    markImported(user.id, done, key)
  }
  return { places: statusRows.length, guides: bundle.guides.length, photos: bundle.photos.length, ranks: rankRows.length, plans: bundle.plans.length }
}

async function uploadImportedPhoto(client: SupabaseClient, user: SessionUser, photo: StoredPhoto): Promise<void> {
  const id = await stableId(user.id, `photo:${photo.id}`)
  const path = `${user.id}/${photo.placeId}/${id}.webp`
  try {
    await savePlacePhoto(client, photo.blob, path, false)
  } catch (error) {
    // A resumed move: the file went up last time.
    const message = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : ''
    if (!/exists|duplicate/i.test(message)) throw error
  }
  const { error } = await client.from('place_photos').insert({
    id,
    place_id: photo.placeId,
    user_id: user.id,
    is_owner: false,
    storage_path: path,
    width: photo.width,
    height: photo.height,
  })
  if (error && error.code !== '23505') throw error
}

// ---------------------------------------------------------------------------
// People: search, suggestions, and one person's profile
// ---------------------------------------------------------------------------

type PersonRow = { id: string; name: string; handle: string; avatar_url?: string | null; is_owner?: boolean | null }

function asFriend(row: PersonRow): FriendProfile {
  return { id: row.id, name: row.name, handle: row.handle, avatarUrl: row.avatar_url || undefined }
}

/**
 * Letters, digits, spaces, and a few name characters. Anything that could change a PostgREST filter
 * (commas, parentheses, wildcards, backslashes) is dropped before it reaches the query.
 */
export function cleanPeopleQuery(raw: string): string {
  return raw.trim().replace(/^@/, '').replace(/[^\p{L}\p{N} _.'-]/gu, '').replace(/\s+/g, ' ').slice(0, 40)
}

/** Partial, case-insensitive match on username or display name. Profiles hold no email, so none is exposed. */
export async function searchPeople(client: SupabaseClient, raw: string, meId: string): Promise<FriendProfile[]> {
  const query = cleanPeopleQuery(raw)
  if (query.length < 2) return []
  const like = `*${query.replace(/_/g, '\\_')}*`
  const run = (columns: string) => client
    .from('profiles')
    .select(columns)
    .or(`handle.ilike.${like},name.ilike.${like}`)
    .neq('id', meId)
    .order('handle', { ascending: true })
    .limit(12)
  let res = await run('id, name, handle, avatar_url')
  if (res.error && /avatar_url|schema cache/i.test(res.error.message)) res = await run('id, name, handle')
  if (res.error) throw new Error('Search is not answering. Try again.')
  const rows = (res.data ?? []) as unknown as PersonRow[]
  const lower = query.toLowerCase()
  // Usernames that start with the query first, then names that do, then everything else.
  const rank = (row: PersonRow) => (row.handle.startsWith(lower) ? 0 : row.name.toLowerCase().startsWith(lower) ? 1 : 2)
  return rows.sort((a, b) => rank(a) - rank(b) || a.handle.localeCompare(b.handle)).map(asFriend)
}

/** People to add when someone has no friends yet: the house account first, then the newest members. */
export async function suggestPeople(client: SupabaseClient, meId: string, skip: string[]): Promise<FriendProfile[]> {
  let res = await client.from('profiles').select('id, name, handle, avatar_url, is_owner').order('created_at', { ascending: false }).limit(24)
  if (res.error && /avatar_url|created_at|schema cache/i.test(res.error.message)) {
    res = await client.from('profiles').select('id, name, handle, is_owner').limit(24) as typeof res
  }
  if (res.error) return []
  const hidden = new Set([meId, ...skip])
  const rows = ((res.data ?? []) as PersonRow[]).filter((row) => !hidden.has(row.id) && row.name !== 'New member')
  rows.sort((a, b) => Number(Boolean(b.is_owner)) - Number(Boolean(a.is_owner)))
  return rows.slice(0, 6).map(asFriend)
}

export type PersonList = { id: string; title: string; visibility: GuideVisibility; placeIds: string[]; emoji?: string; color?: string }

export type PersonView = {
  profile: FriendProfile
  /** Their ranks. The database only returns these to friends (and to the person themself). */
  scores: Record<string, number>
  been: string[]
  togo: string[]
  /** Lists the viewer may see: public ones, plus friends-only ones when you are friends. */
  lists: PersonList[]
  /** True when you and they are friends right now (read fresh, so a request accepted elsewhere counts). */
  friend: boolean
}

/** One person's profile, read when the page opens. Privacy is the database's row rules; nothing here widens them. */
export async function loadPerson(client: SupabaseClient, handle: string): Promise<PersonView | null> {
  const clean = cleanHandle(handle)
  if (!HANDLE_RULE.test(clean) && !/^[a-z0-9_]{1,30}$/.test(clean)) return null
  let found = await client.from('profiles').select('id, name, handle, avatar_url').eq('handle', clean).maybeSingle()
  if (found.error && /avatar_url|schema cache/i.test(found.error.message)) {
    found = await client.from('profiles').select('id, name, handle').eq('handle', clean).maybeSingle() as typeof found
  }
  if (found.error) throw new Error('Could not open that profile. Try again.')
  if (!found.data) return null
  const person = found.data as PersonRow
  const me = (await client.auth.getSession()).data.session?.user.id ?? ''
  const [rankRes, statusRes, guideRes, friendRes] = await Promise.all([
    client.from('rankings').select('place_id, score').eq('user_id', person.id),
    client.from('place_status').select('place_id, status').eq('user_id', person.id),
    (async () => {
      const rich = await client.from('guides').select('id, title, visibility, emoji, accent').eq('owner_id', person.id).neq('visibility', 'private')
      if (!rich.error || !missingListColumn(rich.error)) return rich
      return client.from('guides').select('id, title, visibility').eq('owner_id', person.id).neq('visibility', 'private')
    })(),
    me && me !== person.id
      ? client.from('friendships').select('id').eq('status', 'accepted')
        .or(`and(requester_id.eq.${me},addressee_id.eq.${person.id}),and(requester_id.eq.${person.id},addressee_id.eq.${me})`).limit(1)
      : Promise.resolve({ data: [] as { id: string }[], error: null }),
  ])
  const scores: Record<string, number> = {}
  for (const row of rankRes.data ?? []) scores[row.place_id] = Number(row.score)
  const been: string[] = []
  const togo: string[] = []
  for (const row of statusRes.data ?? []) {
    if (row.status === 'been') been.push(row.place_id)
    else if (row.status === 'togo') togo.push(row.place_id)
  }
  const guideRows = (guideRes.data ?? []) as { id: string; title: string; visibility: GuideVisibility; emoji?: string | null; accent?: string | null }[]
  const items = await selectGuideItems(client, guideRows.map((row) => row.id))
  const byGuide = new Map<string, ItemRow[]>()
  for (const row of (items.data ?? []) as ItemRow[]) {
    const list = byGuide.get(row.guide_id) ?? []
    list.push(row)
    byGuide.set(row.guide_id, list)
  }
  const lists: PersonList[] = guideRows.map((row) => ({
    id: row.id,
    title: row.title,
    visibility: row.visibility,
    placeIds: (byGuide.get(row.id) ?? []).sort((a, b) => a.position - b.position).map((item) => item.place_id),
    emoji: row.emoji || undefined,
    color: row.accent || undefined,
  }))
  return { profile: asFriend(person), scores, been, togo, lists, friend: (friendRes.data ?? []).length > 0 }
}

// ---------------------------------------------------------------------------
// Profile photo
// ---------------------------------------------------------------------------

const AVATAR_BUCKET = 'avatars'

/**
 * Saves a profile photo that the browser already shrank to a small square WebP.
 * Uses the public `avatars` bucket (migration.sql). Until that bucket exists, the small image is kept
 * inline on the profile row so the photo still shows everywhere; after the migration new uploads go
 * to Storage.
 */
export async function saveAvatar(client: SupabaseClient, userId: string, image: { blob: Blob; dataUrl: string }): Promise<string> {
  const path = `${userId}/avatar-${Date.now()}.webp`
  const uploaded = await client.storage.from(AVATAR_BUCKET).upload(path, image.blob, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' })
  if (uploaded.error) {
    const message = String((uploaded.error as { message?: unknown }).message ?? '')
    throw new Error(message ? `Could not upload that photo: ${message}` : 'Could not upload that photo.')
  }
  const url = client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
  const { error } = await client.from('profiles').update({ avatar_url: url }).eq('id', userId)
  if (error) {
    void client.storage.from(AVATAR_BUCKET).remove([path])
    throw new Error(error.message || 'Could not save your photo.')
  }
  void removeOldAvatars(client, userId, path)
  return url
}

/** Older photos in your own avatars folder. Best effort: a leftover file is harmless. */
async function removeOldAvatars(client: SupabaseClient, userId: string, keep: string | null) {
  try {
    const listed = await client.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 })
    const stale = (listed.data ?? []).map((file) => `${userId}/${file.name}`).filter((name) => name !== keep)
    if (stale.length) await client.storage.from(AVATAR_BUCKET).remove(stale)
  } catch {
    // leave it
  }
}

export async function clearAvatar(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw new Error(error.message || 'Could not remove your photo.')
  void removeOldAvatars(client, userId, null)
}

/** One list by id, for a list page opened from a link or a profile. Row rules decide whether it comes back. */
export async function loadGuideById(client: SupabaseClient, id: string): Promise<UserGuide | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  let res = await client.from('guides').select('id, owner_id, title, visibility, cover_place_id, emoji, accent').eq('id', id).maybeSingle()
  if (res.error && missingListColumn(res.error)) {
    res = await client.from('guides').select('id, owner_id, title, visibility, cover_place_id').eq('id', id).maybeSingle() as typeof res
  }
  if (res.error) throw new Error('Could not open that list. Try again.')
  if (!res.data) return null
  const row = res.data as GuideRow
  const items = await selectGuideItems(client, [row.id])
  const sorted = ((items.data ?? []) as ItemRow[]).slice().sort((a, b) => a.position - b.position)
  const notes: Record<string, string> = {}
  const addedAt: Record<string, string> = {}
  for (const item of sorted) {
    if (item.note) notes[item.place_id] = item.note
    if (item.added_at) addedAt[item.place_id] = item.added_at
  }
  return {
    id: row.id,
    title: row.title,
    placeIds: sorted.map((item) => item.place_id),
    shared: row.visibility !== 'private',
    collaboratorIds: [],
    ownerId: row.owner_id,
    isPublic: row.visibility === 'public',
    visibility: row.visibility,
    coverPlaceId: row.cover_place_id ?? undefined,
    emoji: row.emoji || undefined,
    color: row.accent || undefined,
    notes,
    addedAt,
  }
}
