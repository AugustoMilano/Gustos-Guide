import { clearCookie, json, sameOrigin, type OwnerEnv } from '../../_lib/owner-auth.ts'

/** POST /api/owner/logout clears the owner cookie. */
export async function onRequestPost({ request }: { request: Request; env: OwnerEnv }): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403)
  return json({ owner: false }, 200, { 'Set-Cookie': clearCookie() })
}
