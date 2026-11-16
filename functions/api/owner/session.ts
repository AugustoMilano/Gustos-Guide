import { isOwnerRequest, json, ownerConfigured, type OwnerEnv } from '../../_lib/owner-auth.ts'

/** GET /api/owner/session -> { owner, configured }. The cookie is HttpOnly, so the page asks here. */
export async function onRequestGet({ request, env }: { request: Request; env: OwnerEnv }): Promise<Response> {
  return json({ owner: await isOwnerRequest(request, env), configured: ownerConfigured(env) })
}
