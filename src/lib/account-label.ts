export type AccountIdentity = {
  name?: string | null
  givenName?: string | null
}

function token(value?: string | null): string {
  const text = (value ?? '').trim()
  if (!text || text.includes('@')) return ''
  return text.split(/\s+/)[0] ?? ''
}

/** Visible signed-in label. Uses a real given name, then the first word of the display name. */
export function accountGreeting(identity: AccountIdentity): string {
  return token(identity.givenName) || token(identity.name) || 'Account'
}

/** Full display name for assistive tech. Never an email address. */
export function accountAccessibleName(identity: AccountIdentity): string {
  const name = (identity.name ?? '').trim().replace(/\s+/g, ' ')
  if (name && !name.includes('@')) return name
  return accountGreeting(identity)
}
