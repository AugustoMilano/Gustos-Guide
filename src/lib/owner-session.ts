/**
 * Owner status comes only from the server (/api/owner/*), which checks an
 * HttpOnly signed cookie. Typing a name never makes anyone the owner.
 *
 * OWNER_HINT is a plain flag so ordinary visitors never call the session
 * endpoint on load. It grants nothing: the server still decides.
 */
export const OWNER_HINT = 'gusto.owner-hint.v1'

export type OwnerSession = { owner: boolean; configured: boolean }

export function hasOwnerHint(): boolean {
  try {
    return localStorage.getItem(OWNER_HINT) === '1'
  } catch {
    return false
  }
}

function setHint(on: boolean) {
  try {
    if (on) localStorage.setItem(OWNER_HINT, '1')
    else localStorage.removeItem(OWNER_HINT)
  } catch {
    /* storage off */
  }
}

export async function fetchOwnerSession(): Promise<OwnerSession> {
  try {
    const response = await fetch('/api/owner/session', { credentials: 'same-origin', cache: 'no-store' })
    if (!response.ok) return { owner: false, configured: false }
    const body = (await response.json()) as Partial<OwnerSession>
    const session = { owner: body.owner === true, configured: body.configured === true }
    setHint(session.owner)
    return session
  } catch {
    return { owner: false, configured: false }
  }
}

export async function ownerLogin(password: string): Promise<void> {
  const response = await fetch('/api/owner/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  let message = 'Could not sign in.'
  try {
    const body = (await response.json()) as { owner?: boolean; error?: string }
    if (response.ok && body.owner === true) {
      setHint(true)
      return
    }
    if (body.error) message = body.error
  } catch {
    /* non-JSON */
  }
  throw new Error(message)
}

export async function ownerLogout(): Promise<void> {
  setHint(false)
  try {
    await fetch('/api/owner/logout', { method: 'POST', credentials: 'same-origin' })
  } catch {
    /* cookie expires on its own */
  }
}
