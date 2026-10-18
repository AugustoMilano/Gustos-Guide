import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function supabaseClient(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function uploadPlacePhoto(
  client: SupabaseClient,
  file: Blob,
  path: string,
): Promise<string> {
  const { error } = await client.storage.from('place-photos').upload(path, file, {
    contentType: 'image/webp',
    upsert: false,
  })
  if (error) throw error
  const { data } = client.storage.from('place-photos').getPublicUrl(path)
  return data.publicUrl
}
