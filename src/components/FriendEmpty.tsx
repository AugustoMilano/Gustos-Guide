import { useState } from 'react'
import { useApp } from '../state/AppState.tsx'

export function FriendEmpty({
  onSignIn,
  title = 'No friends yet',
  line = 'Search a username, or email an invite. Only people you add show up here.',
}: {
  onSignIn: () => void
  title?: string
  line?: string
}) {
  const app = useApp()
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  if (!app.user) {
    return (
      <div className="friend-empty">
        <p className="font-serif text-2xl italic">Sign in to see friends.</p>
        <p className="mt-1 text-sm">Plans and the feed stay between people you actually know.</p>
        <button type="button" className="btn btn-coral mt-3" onClick={onSignIn}>Sign in</button>
      </div>
    )
  }

  async function addFriend() {
    setError('')
    setNote('')
    if (!app.supabase) {
      setError('Friend search runs on the live account.')
      return
    }
    try {
      await app.requestFriend(handle)
      setHandle('')
      setNote('Request sent.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send that.')
    }
  }

  async function invite() {
    setError('')
    setNote('')
    if (!app.supabase) {
      setError('Invites go out from the live account.')
      return
    }
    try {
      const link = await app.inviteByEmail(email)
      setEmail('')
      setNote(link ? link : 'Invite sent.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not send that.')
    }
  }

  return (
      <div
        className="friend-empty"
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          event.stopPropagation()
        }}
      >
      <p className="font-serif text-2xl italic">{title}</p>
      <p className="mt-1 text-sm">{line}</p>
      <label className="field mt-3">
        <span>Username</span>
        <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="their handle" autoCapitalize="none" />
      </label>
      <label className="field mt-3">
        <span>Or email</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@email.com" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-coral" disabled={!handle.trim()} onClick={() => void addFriend()}>Add friends</button>
        <button type="button" className="btn" disabled={!email.trim()} onClick={() => void invite()}>Invite a friend</button>
      </div>
      {note ? <p className="mt-2 break-all text-sm">{note}</p> : null}
      {error ? <p className="mt-2 text-sm">{error}</p> : null}
    </div>
  )
}
