import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

export function JoinPage() {
  const { token = '' } = useParams()
  const app = useApp()
  const [signIn, setSignIn] = useState(false)
  const [joined, setJoined] = useState<'guide' | 'plan' | null | undefined>(undefined)
  const guide = app.guides.find((item) => item.inviteToken === token || item.id === token)
  const plan = app.plans.find((item) => item.inviteToken === token || item.id === token)
  usePageMeta("Invite · Gusto's Guide", 'Open a shared list or dinner plan on this browser.', './og/og.svg')

  const target = guide ? `/list/${guide.id}` : plan ? `/plan/${plan.id}` : ''
  const label = guide?.title ?? plan?.title

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
      <h1 className="font-serif text-5xl italic">{label ? `Join ${label}` : 'That invite is not on this browser.'}</h1>
      <p className="mt-3 max-w-xl">
        Invites stay local. This link opens the list or plan on this browser. It does not email anyone.
      </p>
      {label && !app.user ? (
        <button type="button" className="btn btn-coral mt-4" onClick={() => setSignIn(true)}>Sign in to join</button>
      ) : null}
      {label && app.user ? (
        <button
          type="button"
          className="btn btn-coral mt-4"
          onClick={() => setJoined(app.joinInvite(token))}
        >
          {joined ? 'Joined' : guide ? 'Join the list' : 'RSVP yes'}
        </button>
      ) : null}
      {joined && target ? <p className="mt-3"><Link className="font-bold" to={target}>Open it</Link></p> : null}
      {label && !joined ? <p className="mt-3"><Link className="font-bold" to={target}>Look first</Link></p> : null}
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
  )
}
