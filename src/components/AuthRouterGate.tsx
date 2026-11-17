import { useEffect, useState, type ReactNode } from 'react'
import { authRouterHeld, releaseAuthCallback, takeAuthPending } from '../lib/auth-callback.ts'
import { loadSupabase } from '../social/supabase.ts'
import { useApp } from '../state/AppState.tsx'

export function AuthRouterGate({ children }: { children: ReactNode }) {
  const { noteAuthFailure } = useApp()
  const [ready, setReady] = useState(() => !authRouterHeld())
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    if (ready) return
    let cancel = false
    const finish = (message?: string | null) => {
      if (cancel) return
      if (message) noteAuthFailure(message)
      releaseAuthCallback()
      setReady(true)
    }
    // Never hang on the callback screen: give the code exchange about 8 seconds.
    const timer = window.setTimeout(() => {
      if (cancel) return
      cancel = true
      takeAuthPending()
      releaseAuthCallback()
      setFailed('Sign-in is taking too long.')
    }, 8000)
    void loadSupabase().then((client) => {
      if (!client) {
        window.clearTimeout(timer)
        takeAuthPending()
        finish(null)
        return null
      }
      return client.auth.getSession()
    }).then((result) => {
      if (!result) return
      const { data, error } = result
      window.clearTimeout(timer)
      const pending = takeAuthPending()
      if (data?.session) return finish(null)
      if (pending && !cancel) {
        // A sign-in link carries a one-time code that only the browser which asked for it can use.
        // Opened from a mail app's own browser, or on another device, it lands here with no session.
        cancel = true
        releaseAuthCallback()
        const crossBrowser = !error || /verifier|code_verifier|pkce|both auth code/i.test(error.message)
        setFailed(crossBrowser
          ? 'This link was opened in a different browser or app than the one that asked for it. Ask for a new link from this browser, or type the code from the email where you asked for it.'
          : error.message || 'Could not finish sign-in.')
        return
      }
      finish(null)
    }).catch((error: unknown) => {
      window.clearTimeout(timer)
      takeAuthPending()
      if (cancel) return
      cancel = true
      releaseAuthCallback()
      setFailed(error instanceof Error ? error.message : 'Could not finish sign-in.')
    })
    return () => {
      cancel = true
      window.clearTimeout(timer)
    }
  }, [ready, noteAuthFailure])

  if (failed) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-4 pt-28" role="alert">
        <h1 className="font-serif text-5xl italic">Sign-in did not finish.</h1>
        <p className="mt-3 max-w-md text-sm">{failed}</p>
        <p className="mt-4 flex gap-4 text-sm">
          <a className="underline" href="/" onClick={() => { noteAuthFailure(failed) }}>Try again</a>
          <a className="underline" href="/#/" onClick={(event) => { event.preventDefault(); setFailed(null); setReady(true) }}>Go home</a>
        </p>
      </main>
    )
  }
  if (!ready) {
    return (
      <main id="main" className="mx-auto max-w-3xl px-4 pt-28" aria-busy="true">
        <h1 className="font-serif text-5xl italic">Signing you in…</h1>
        <p className="mt-3 max-w-md text-sm">Finishing the sign-in link. This page opens the guide you came from.</p>
      </main>
    )
  }
  return children
}
