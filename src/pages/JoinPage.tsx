import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { usePageMeta } from '../lib/meta.ts'
import { previewInvite, supabaseClient } from '../social/supabase.ts'
import { useApp } from '../state/AppState.tsx'

export function JoinPage() {
  const { token = '' } = useParams()
  const app = useApp()
  const [signIn, setSignIn] = useState(false)
  const [joined, setJoined] = useState<'guide' | 'plan' | 'friend' | null | undefined>(undefined)
  const [remoteTitle, setRemoteTitle] = useState('')
  const [remoteKind, setRemoteKind] = useState('')
  const guide = app.guides.find((item) => item.inviteToken === token || item.id === token)
  const plan = app.plans.find((item) => item.inviteToken === token || item.id === token)
  usePageMeta("Invite · Gusto's Guide", app.supabase ? 'Join a list, a plan, or a friend request.' : 'Open a shared list or dinner plan on this browser.', './og/og.svg')

  useEffect(() => {
    const client = supabaseClient()
    if (!client || !token) return
    let cancel = false
    void previewInvite(client, token).then((row) => {
      if (cancel || !row) return
      setRemoteTitle(row.title)
      setRemoteKind(row.kind)
    })
    return () => {
      cancel = true
    }
  }, [token])

  const target = guide ? `/list/${guide.id}` : plan ? `/plan/${plan.id}` : remoteKind === 'friend' ? '/feed' : remoteKind === 'plan' ? '/plans' : remoteKind === 'guide' ? '/my' : ''
  const label = guide?.title ?? plan?.title ?? remoteTitle

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
      <h1 className="font-serif text-5xl italic">{label ? `Join ${label}` : 'That invite is not on this browser.'}</h1>
      <p className="mt-3 max-w-xl">
        {app.supabase
          ? 'Sign in, then join. A friend link accepts the request. A list or plan link adds you.'
          : 'Invites stay local. This link opens the list or plan on this browser. It does not email anyone.'}
      </p>
      {label && !app.user ? (
        <button type="button" className="btn btn-coral mt-4" onClick={() => setSignIn(true)}>Sign in to join</button>
      ) : null}
      {label && app.user ? (
        <button
          type="button"
          className="btn btn-coral mt-4"
          onClick={() => {
            void app.joinInvite(token).then((kind) => setJoined(kind))
          }}
        >
          {joined ? 'Joined' : guide || remoteKind === 'guide' ? 'Join the list' : remoteKind === 'friend' ? 'Accept friend request' : 'RSVP yes'}
        </button>
      ) : null}
      {joined && target ? <p className="mt-3"><Link className="font-bold" to={target}>Open it</Link></p> : null}
      {label && !joined ? <p className="mt-3"><Link className="font-bold" to={target}>Look first</Link></p> : null}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
  )
}
