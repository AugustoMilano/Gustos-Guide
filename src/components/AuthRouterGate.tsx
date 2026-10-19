import { useEffect, useState, type ReactNode } from 'react'
import { authRouterHeld, releaseAuthCallback, takeAuthPending } from '../lib/auth-callback.ts'
import { supabaseClient } from '../social/supabase.ts'
import { useApp } from '../state/AppState.tsx'

export function AuthRouterGate({ children }: { children: ReactNode }) {
  const { noteAuthFailure } = useApp()
  const [ready, setReady] = useState(() => !authRouterHeld())

  useEffect(() => {
    if (ready) return
    let cancel = false
    const finish = (message?: string | null) => {
      if (cancel) return
      if (message) noteAuthFailure(message)
      releaseAuthCallback()
      setReady(true)
    }
    const client = supabaseClient()
    if (!client) {
      takeAuthPending()
      finish(null)
      return
    }
    void client.auth.getSession().then(({ error }) => {
      const pending = takeAuthPending()
      finish(pending ? error?.message : null)
    }).catch((error: unknown) => {
      takeAuthPending()
      finish(error instanceof Error ? error.message : 'Could not finish sign-in.')
    })
    return () => {
      cancel = true
    }
  }, [ready, noteAuthFailure])

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
