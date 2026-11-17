import { useState } from 'react'
import { useApp } from '../state/AppState.tsx'
import { PeopleSearch } from './PeopleSearch.tsx'

export function FriendEmpty({
  onSignIn,
  title = 'No friends yet',
  line = 'Search by name or username, or email an invite. Only people you add show up here.',
}: {
  onSignIn: () => void
  title?: string
  line?: string
}) {
  const app = useApp()
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
      // The same words whether or not that address already has an account.
      setNote(link ? `Invite ready. Send them this link: ${link}` : 'Invite ready.')
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
      {app.supabase ? <PeopleSearch /> : <p className="mt-3 text-sm">Friend search runs on the live account.</p>}
      <label className="field mt-3">
        <span>Invite by email</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@email.com" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={!email.trim()} onClick={() => void invite()}>Invite a friend</button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setError('')
            setNote('')
            void app.createFriendLink().then(async (link) => {
              try {
                await navigator.clipboard.writeText(link)
                setNote('Invite link copied.')
              } catch {
                setNote(link)
              }
            }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not make a link.'))
          }}
        >
          Copy invite link
        </button>
      </div>
      {note ? <p className="mt-2 break-all text-sm">{note}</p> : null}
      {error ? <p className="mt-2 text-sm">{error}</p> : null}
    </div>
  )
}
