import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authCallbackUrl, rememberAuthReturn } from '../lib/auth-callback.ts'

const PLACE_BUCKET = 'place-photos'
const OWNER_BUCKET = 'owner-photos'

function bucketMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const record = error as { message?: unknown; status?: unknown; statusCode?: unknown }
  const message = typeof record.message === 'string' ? record.message : ''
  const status = String(record.status ?? record.statusCode ?? '')
  return /bucket not found/i.test(message) || status === '404'
}

function ignorableStorage(error: unknown): boolean {
  if (!error || bucketMissing(error)) return true
  const message = typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : ''
  return /not found|does not exist/i.test(message)
}

let cached: SupabaseClient | null | undefined

export type AuthProviderName = 'apple' | 'google' | 'x'

export function authProviders(): AuthProviderName[] {
  const raw = import.meta.env.VITE_AUTH_PROVIDERS ?? ''
  const allowed = new Set<AuthProviderName>(['apple', 'google', 'x'])
  const found: AuthProviderName[] = []
  for (const part of raw.split(',')) {
    const name = part.trim().toLowerCase()
    if (allowed.has(name as AuthProviderName) && !found.includes(name as AuthProviderName)) found.push(name as AuthProviderName)
  }
  return found
}

export function supabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    cached = null
    return null
  }
  cached = createClient(url, key, {
    auth: {
      // PKCE only. Implicit puts tokens in the hash, and the hash router treats that as a page.
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  return cached
}

export function ownerPhotoUrl(path: string): string {
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '')
  if (!base || !path) return ''
  const encoded = path.split('/').map((part) => encodeURIComponent(part)).join('/')
  return `${base}/storage/v1/object/public/${OWNER_BUCKET}/${encoded}`
}

export async function uploadPlacePhoto(client: SupabaseClient, file: Blob, path: string, bucket = PLACE_BUCKET): Promise<string> {
  const { error } = await client.storage.from(bucket).upload(path, file, {
    contentType: 'image/webp',
    upsert: false,
    cacheControl: '31536000',
  })
  if (error) throw error
  return path
}

export async function signedPhotoUrl(client: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await client.storage.from(PLACE_BUCKET).createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) throw error ?? new Error('Could not open that photo.')
  return data.signedUrl
}

// Owner shots go to the public bucket. Until that bucket exists, fall back to
// the private one so an upload is not lost before the migration is applied.
export async function savePlacePhoto(client: SupabaseClient, file: Blob, path: string, owner: boolean): Promise<string> {
  if (owner) {
    try {
      await uploadPlacePhoto(client, file, path, OWNER_BUCKET)
      return ownerPhotoUrl(path)
    } catch (error) {
      if (!bucketMissing(error)) throw error
    }
  }
  await uploadPlacePhoto(client, file, path, PLACE_BUCKET)
  return signedPhotoUrl(client, path)
}

export async function removePlacePhoto(client: SupabaseClient, path: string, owner: boolean): Promise<void> {
  if (owner) {
    const removed = await client.storage.from(OWNER_BUCKET).remove([path])
    if (!ignorableStorage(removed.error)) throw removed.error
  }
  const removed = await client.storage.from(PLACE_BUCKET).remove([path])
  if (!ignorableStorage(removed.error)) throw removed.error
}

export async function sendMagicLink(client: SupabaseClient, email: string): Promise<void> {
  rememberAuthReturn()
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: authCallbackUrl(), shouldCreateUser: true },
  })
  if (error) throw error
}

export async function signInWithProvider(client: SupabaseClient, provider: AuthProviderName): Promise<void> {
  rememberAuthReturn()
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: authCallbackUrl() },
  })
  if (error) throw error
}

export async function previewInvite(client: SupabaseClient, token: string): Promise<{ kind: string; title: string } | null> {
  const { data, error } = await client.rpc('preview_invite', { token })
  if (error || !data) return null
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object' || !('kind' in row)) return null
  const kind = String((row as { kind: string }).kind || '')
  const title = String((row as { title: string }).title || '')
  if (!kind || !title) return null
  return { kind, title }
}
