import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

/**
 * Owner sign-in. Not linked from the visitor UI except from the owner-only
 * queues. The password is checked by /api/owner/login against a hash held as a
 * Cloudflare secret; the session is an HttpOnly signed cookie.
 */
export function OwnerPage() {
  const app = useApp()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  usePageMeta("Owner · Gusto's Guide", 'Owner sign-in.', './og/og.png')
  const { checkOwner } = app

  useEffect(() => {
    if (!app.supabase) void checkOwner()
  }, [app.supabase, checkOwner])

  useEffect(() => {
    // Keep this page out of search results.
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  if (app.supabase) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-md px-4 pt-28 pb-16 outline-none">
        <h1 className="font-serif text-5xl italic">Owner</h1>
        <p className="mt-3 text-sm">On this build the owner signs in with his account. Owner rights come from the server, not from this page.</p>
      </main>
    )
  }

  if (!app.ownerChecked) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-md px-4 pt-28 pb-16 outline-none" aria-busy="true">
        <h1 className="font-serif text-5xl italic">Owner</h1>
        <p className="mt-3 text-sm">Checking…</p>
      </main>
    )
  }

  if (app.ownerSignedIn) {
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-md px-4 pt-28 pb-16 outline-none" data-owner="1">
        <h1 className="font-serif text-5xl italic">Owner</h1>
        <p className="mt-3 text-sm" role="status">Signed in as the owner on this browser for 30 days.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="btn btn-coral" to="/seattle/score">Needs a score</Link>
          <Link className="btn" to="/seattle/score/quick">Quick score</Link>
          <Link className="btn" to="/seattle/photos">Needs a photo</Link>
        </div>
        <button type="button" className="btn mt-6" onClick={() => void app.ownerSignOut()}>Owner sign out</button>
      </main>
    )
  }

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-md px-4 pt-28 pb-16 outline-none">
      <h1 className="font-serif text-5xl italic">Owner</h1>
      {!app.ownerConfigured ? (
        <p className="mt-3 text-sm" role="status">Owner sign-in is not set up on this deploy yet.</p>
      ) : null}
      <form
        className="mt-4"
        data-auth="owner"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          setBusy(true)
          void app.ownerSignIn(password)
            .then(() => setPassword(''))
            .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not sign in.'))
            .finally(() => setBusy(false))
        }}
      >
        <label className="field">
          <span>Owner password</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="mt-3 text-sm" role="alert">{error}</p> : null}
        <button type="submit" className="btn btn-coral mt-4" disabled={busy || !app.ownerConfigured}>
          {busy ? 'Checking…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
