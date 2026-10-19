import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SignInSheet } from '../components/SignInSheet.tsx'
import { usePageMeta } from '../lib/meta.ts'
import { previewInvite, supabaseClient } from '../social/supabase.ts'
import { useApp } from '../state/AppState.tsx'

type LocalInvite = { token: string; name: string; handle: string }

function localFriend(token: string): LocalInvite | undefined {
  try {
    const bag = JSON.parse(localStorage.getItem('gusto.friend-links.v1') || '[]') as LocalInvite[]
    return bag.find((item) => item.token === token)
  } catch {
    return undefined
  }
}

export function JoinPage() {
  const { token = '' } = useParams()
  const app = useApp()
  const [signIn, setSignIn] = useState(false)
  const [joined, setJoined] = useState<'guide' | 'plan' | 'friend' | null | undefined>(undefined)
  const autoFriend = useRef(false)
  const [remoteTitle, setRemoteTitle] = useState('')
  const [remoteKind, setRemoteKind] = useState('')
  const friend = localFriend(token)
  const guide = app.guides.find((item) => item.inviteToken === token || item.id === token)
  const plan = app.plans.find((item) => item.inviteToken === token || item.id === token)
  const kind = friend ? 'friend' : guide ? 'guide' : plan ? 'plan' : remoteKind
  const label = friend ? friend.name : guide?.title ?? plan?.title ?? remoteTitle
  usePageMeta(
    friend ? `${friend.name} wants to eat with you` : "Invite · Gusto's Guide",
    friend ? 'Sign in and you are friends.' : 'Join a list, a plan, or a friend.',
    './og/og.svg',
  )

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

  useEffect(() => {
    if (autoFriend.current || !app.user || kind !== 'friend' || !app.supabase) return
    autoFriend.current = true
    void app.joinInvite(token).then((result) => setJoined(result)).catch(() => setJoined(null))
  }, [app.user, kind, token, app])

  const target = kind === 'friend' ? '/feed' : guide ? `/list/${guide.id}` : plan ? `/plan/${plan.id}` : kind === 'plan' ? '/plans' : kind === 'guide' ? '/my' : ''
  const own = Boolean(friend && app.user && friend.handle === app.user.handle)

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-xl px-4 pt-28 outline-none">
      <section className="list-og">
        <div className="list-og-photo">
          <span className="list-og-mark" aria-hidden="true">{kind === 'friend' ? '🍽' : kind === 'plan' ? '🌙' : '📋'}</span>
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.14em] uppercase">{kind === 'friend' ? 'Friend invite' : kind === 'plan' ? 'Dinner plan' : 'List'}</p>
          <h1 className="mt-1 font-serif text-4xl italic leading-none">{label ? (kind === 'friend' ? `${label} wants to eat with you.` : `Join ${label}`) : 'That invite is not on this browser.'}</h1>
          <p className="mt-3 text-sm">
            {kind === 'friend'
              ? own
                ? 'This is your link. Send it to someone you actually eat with.'
                : app.supabase
                  ? 'Sign in and the request is accepted. No extra tap.'
                  : 'On the live site, signing in accepts this. This browser keeps the card so you can see how it reads.'
              : app.supabase
                ? 'Sign in, then join. A list or plan link adds you.'
                : 'This link opens the list or plan on this browser.'}
          </p>
          {label && !app.user ? (
            <button type="button" className="btn btn-coral mt-4" onClick={() => setSignIn(true)}>Sign in</button>
          ) : null}
          {label && app.user && kind !== 'friend' ? (
            <button type="button" className="btn btn-coral mt-4" onClick={() => void app.joinInvite(token).then((result) => setJoined(result))}>
              {joined ? 'Joined' : kind === 'guide' ? 'Join the list' : 'RSVP yes'}
            </button>
          ) : null}
          {joined === 'friend' ? <p className="mt-3 text-sm">You are friends. The feed is the next table.</p> : null}
          {joined && target ? <p className="mt-3"><Link className="btn" to={target}>Open it</Link></p> : null}
        </div>
      </section>
      <SignInSheet open={signIn} onClose={() => setSignIn(false)} />
    </main>
  )
}
