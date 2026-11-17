import type { SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabaseClient } from '../social/supabase.ts'

/**
 * "My order": a person's own order for a house guide. Personal only; it never changes the guide.
 * Kept on the device right away, and in the guide_orders table when that exists, so it follows the
 * account to any phone or computer. Before the table is added the device copy is the whole story,
 * and it uploads itself the first time the table answers.
 */
export type SavedOrder = { ids: string[]; at: string }
export type OrderSync = 'idle' | 'account' | 'device' | 'saving' | 'error'

const TABLE = 'guide_orders'

function localKey(userId: string) {
  return `gusto.myorder.v1.${userId}`
}

function readAll(userId: string): Record<string, SavedOrder> {
  try {
    const raw = localStorage.getItem(localKey(userId))
    const parsed = raw ? (JSON.parse(raw) as unknown) : null
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, SavedOrder>) : {}
  } catch {
    return {}
  }
}

function writeLocal(userId: string, slug: string, order: SavedOrder | null) {
  const all = readAll(userId)
  if (order) all[slug] = order
  else delete all[slug]
  try { localStorage.setItem(localKey(userId), JSON.stringify(all)) } catch { /* storage full or off */ }
}

export function readLocalOrder(userId: string, slug: string): SavedOrder | null {
  const found = readAll(userId)[slug]
  return found && Array.isArray(found.ids) ? found : null
}

/** The table is not there yet (migration not applied): the device copy is all there is. */
export function tableMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as { code?: unknown; message?: unknown }
  const code = String(record.code ?? '')
  const message = String(record.message ?? '')
  return code === 'PGRST205' || code === '42P01' || /could not find the table|does not exist|schema cache/i.test(message)
}

async function readRemote(client: SupabaseClient, userId: string, slug: string) {
  const res = await client.from(TABLE).select('place_ids, updated_at').eq('user_id', userId).eq('guide_slug', slug).maybeSingle()
  if (res.error) return { error: res.error, order: null as SavedOrder | null }
  const row = res.data as { place_ids: string[]; updated_at: string } | null
  return { error: null, order: row ? { ids: row.place_ids, at: row.updated_at } : null }
}

async function writeRemote(client: SupabaseClient, userId: string, slug: string, order: SavedOrder | null) {
  if (!order) return (await client.from(TABLE).delete().eq('user_id', userId).eq('guide_slug', slug)).error
  return (await client.from(TABLE).upsert({ user_id: userId, guide_slug: slug, place_ids: order.ids, updated_at: order.at })).error
}

/** Rows in the saved order; anything added to the guide since goes at the end, in guide order. */
export function applyOrder<T>(rows: T[], idOf: (row: T) => string, ids: string[] | null | undefined): T[] {
  if (!ids || !ids.length) return rows
  const at = new Map(ids.map((id, index) => [id, index]))
  return rows
    .map((row, index) => ({ row, index, slot: at.get(idOf(row)) }))
    .sort((a, b) => {
      const left = a.slot ?? ids.length + a.index
      const right = b.slot ?? ids.length + b.index
      return left - right
    })
    .map((item) => item.row)
}

export function useMyOrder(slug: string, userId: string | null, accounts: boolean) {
  const [order, setOrder] = useState<SavedOrder | null>(null)
  const [sync, setSync] = useState<OrderSync>('idle')
  const [error, setError] = useState('')
  const pending = useRef<SavedOrder | null | undefined>(undefined)

  useEffect(() => {
    setError('')
    if (!userId || !slug) {
      setOrder(null)
      setSync('idle')
      return
    }
    const local = readLocalOrder(userId, slug)
    setOrder(local)
    const client = accounts ? supabaseClient() : null
    if (!client) {
      setSync('device')
      return
    }
    let live = true
    void readRemote(client, userId, slug).then(async ({ error: readError, order: remote }) => {
      if (!live) return
      if (readError) {
        setSync(tableMissing(readError) ? 'device' : 'error')
        if (!tableMissing(readError)) setError('Your order could not be read from your account. Showing this device’s copy.')
        return
      }
      // Newest wins. A device copy made before the table existed uploads itself here.
      if (remote && (!local || remote.at >= local.at)) {
        writeLocal(userId, slug, remote)
        setOrder(remote)
        setSync('account')
      } else if (local) {
        const pushError = await writeRemote(client, userId, slug, local)
        if (!live) return
        setSync(pushError ? (tableMissing(pushError) ? 'device' : 'error') : 'account')
      } else setSync('account')
    })
    return () => { live = false }
  }, [slug, userId, accounts])

  const push = useCallback(async (next: SavedOrder | null) => {
    if (!userId) return
    const client = accounts ? supabaseClient() : null
    if (!client) {
      setSync('device')
      return
    }
    pending.current = next
    setSync('saving')
    setError('')
    const writeError = await writeRemote(client, userId, slug, next)
    if (pending.current !== next) return
    pending.current = undefined
    if (!writeError) setSync('account')
    else if (tableMissing(writeError)) setSync('device')
    else {
      setSync('error')
      setError('Your order did not save to your account. It is still on this device.')
    }
  }, [slug, userId, accounts])

  const save = useCallback((ids: string[]) => {
    if (!userId) return
    const next = { ids, at: new Date().toISOString() }
    writeLocal(userId, slug, next)
    setOrder(next)
    void push(next)
  }, [slug, userId, push])

  // Reset is saved as an empty order (not a delete), so an older copy on another device cannot
  // come back and win.
  const reset = useCallback(() => { save([]) }, [save])

  const retry = useCallback(() => { void push(order) }, [order, push])

  return { order, sync, error, save, reset, retry }
}
