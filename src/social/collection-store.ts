import type { SupabaseClient } from '@supabase/supabase-js'
import type { CityId } from '../lib/city.ts'
import type { HouseCollection } from '../lib/collections.ts'

export const COLLECTIONS_MIGRATION = 'migrations/20261021080000_collections.sql'

type CollectionRow = {
  id: string
  city: string
  title: string
  slug: string
  blurb: string | null
  position: number
}

type MemberRow = {
  collection_id: string
  place_id: string
  position: number
}

export type CollectionWrite = { ok: true } | { ok: false; missing: boolean; message: string }

type CollectionFail = { ok: false; missing: boolean; message: string }

function asCity(value: string): CityId | null {
  if (value === 'seattle' || value === 'eastside' || value === 'la' || value === 'sf' || value === 'peninsula') return value
  return null
}

export function collectionTableMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as { code?: string; message?: string }
  const message = record.message ?? ''
  return record.code === '42P01' || record.code === 'PGRST205' || /schema cache|could not find the table/i.test(message)
}

function failed(error: { message?: string } | null, fallback: string): CollectionFail {
  return {
    ok: false,
    missing: collectionTableMissing(error),
    message: error?.message || fallback,
  }
}

export function unpublishedNote(missing: boolean): string {
  if (missing) return `Not published. Apply ${COLLECTIONS_MIGRATION} on the house account.`
  return 'Not published. Collections save on the house account.'
}

export async function fetchCollections(client: SupabaseClient): Promise<
  { ok: true; rows: HouseCollection[] } | { ok: false; missing: boolean; message: string }
> {
  try {
  const [lists, members] = await Promise.all([
    client.from('collections').select('id, city, title, slug, blurb, position').order('position', { ascending: true }),
    client.from('collection_places').select('collection_id, place_id, position').order('position', { ascending: true }),
  ])
  const error = lists.error ?? members.error
  if (error) return failed(error, 'Could not load collections.')
  const grouped = new Map<string, MemberRow[]>()
  const memberRows = Array.isArray(members.data) ? (members.data as MemberRow[]) : []
  for (const row of memberRows) {
    if (!row || typeof row.collection_id !== 'string' || typeof row.place_id !== 'string') continue
    const list = grouped.get(row.collection_id) ?? []
    list.push(row)
    grouped.set(row.collection_id, list)
  }
  const rows: HouseCollection[] = []
  const listRows = Array.isArray(lists.data) ? (lists.data as CollectionRow[]) : []
  for (const row of listRows) {
    const city = asCity(row.city)
    if (!city || typeof row.id !== 'string') continue
    const places = (grouped.get(row.id) ?? []).slice().sort((a, b) => a.position - b.position)
    rows.push({
      id: row.id,
      city,
      title: typeof row.title === 'string' ? row.title : 'Collection',
      slug: typeof row.slug === 'string' ? row.slug : '',
      blurb: row.blurb?.trim() ? row.blurb.trim() : null,
      position: typeof row.position === 'number' ? row.position : 0,
      placeIds: places.map((place) => place.place_id),
      published: true,
    })
  }
  return { ok: true, rows: rows.filter((row) => row.slug) }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not load collections.'
    return { ok: false, missing: false, message }
  }
}

export async function insertCollection(
  client: SupabaseClient,
  userId: string,
  draft: { city: CityId; title: string; slug: string; blurb: string | null; position: number; placeIds: string[] },
): Promise<{ ok: true; id: string } | { ok: false; missing: boolean; message: string }> {
  const { data, error } = await client
    .from('collections')
    .insert({
      city: draft.city,
      title: draft.title,
      slug: draft.slug,
      blurb: draft.blurb,
      position: draft.position,
      created_by: userId,
      updated_by: userId,
    })
    .select('id')
    .single()
  if (error || !data?.id) return failed(error, 'Could not save that collection.')
  const id = String(data.id)
  if (!draft.placeIds.length) return { ok: true, id }
  const places = await client.from('collection_places').insert(
    draft.placeIds.map((placeId, position) => ({
      collection_id: id,
      place_id: placeId,
      position,
      updated_by: userId,
    })),
  )
  if (places.error) {
    await client.from('collections').delete().eq('id', id)
    return failed(places.error, 'Could not save that collection.')
  }
  return { ok: true, id }
}

export async function patchCollection(
  client: SupabaseClient,
  userId: string,
  id: string,
  patch: { title: string; blurb: string | null },
): Promise<CollectionWrite> {
  const { error } = await client
    .from('collections')
    .update({ title: patch.title, blurb: patch.blurb, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return failed(error, 'Could not rename that collection.')
  return { ok: true }
}

export async function removeCollection(client: SupabaseClient, id: string): Promise<CollectionWrite> {
  const { error } = await client.from('collections').delete().eq('id', id)
  if (error) return failed(error, 'Could not delete that collection.')
  return { ok: true }
}

export async function addCollectionPlace(
  client: SupabaseClient,
  userId: string,
  collectionId: string,
  placeId: string,
  position: number,
): Promise<CollectionWrite> {
  const { error } = await client.from('collection_places').upsert({
    collection_id: collectionId,
    place_id: placeId,
    position,
    updated_by: userId,
  })
  if (error) return failed(error, 'Could not add that place.')
  return { ok: true }
}

export async function removeCollectionPlace(
  client: SupabaseClient,
  collectionId: string,
  placeId: string,
): Promise<CollectionWrite> {
  const { error } = await client.from('collection_places').delete().eq('collection_id', collectionId).eq('place_id', placeId)
  if (error) return failed(error, 'Could not remove that place.')
  return { ok: true }
}

export async function orderCollectionPlaces(
  client: SupabaseClient,
  userId: string,
  collectionId: string,
  placeIds: string[],
): Promise<CollectionWrite> {
  const writes = await Promise.all(
    placeIds.map((placeId, position) =>
      client
        .from('collection_places')
        .update({ position, updated_by: userId })
        .eq('collection_id', collectionId)
        .eq('place_id', placeId),
    ),
  )
  const error = writes.find((result) => result.error)?.error ?? null
  if (error) return failed(error, 'Could not reorder that collection.')
  return { ok: true }
}
