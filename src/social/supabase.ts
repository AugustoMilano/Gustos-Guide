import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const AUTH_REDIRECT = import.meta.env.VITE_AUTH_REDIRECT || 'https://gustos-guide.pages.dev'

const BUCKET = 'place-photos'

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
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  return cached
}

export async function uploadPlacePhoto(client: SupabaseClient, file: Blob, path: string): Promise<string> {
  const { error } = await client.storage.from(BUCKET).upload(path, file, {
    contentType: 'image/webp',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function signedPhotoUrl(client: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) throw error ?? new Error('Could not open that photo.')
  return data.signedUrl
}

export async function sendMagicLink(client: SupabaseClient, email: string): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: AUTH_REDIRECT, shouldCreateUser: true },
  })
  if (error) throw error
}

export async function signInWithProvider(client: SupabaseClient, provider: AuthProviderName): Promise<void> {
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: { redirectTo: provider === 'x' ? 'https://gustos-guide.pages.dev' : AUTH_REDIRECT },
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
