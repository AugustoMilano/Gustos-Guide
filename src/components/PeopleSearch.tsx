import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { FriendProfile } from '../social/account.ts'
import { useApp } from '../state/AppState.tsx'
import { Avatar } from './Avatar.tsx'

/** Find people by part of a username or display name. Case-insensitive, waits for typing to pause. */
export function PeopleSearch() {
  const app = useApp()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FriendProfile[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const ticket = useRef(0)

  useEffect(() => {
    const text = query.trim().replace(/^@/, '')
    const mine = ++ticket.current
    if (text.length < 2) {
      setResults([])
      setState('idle')
      return
    }
    setState('loading')
    const timer = window.setTimeout(() => {
      void app.searchPeople(text).then((rows) => {
        if (mine !== ticket.current) return
        setResults(rows)
        setState('done')
      }).catch((reason: unknown) => {
        if (mine !== ticket.current) return
        setError(reason instanceof Error ? reason.message : 'Search is not answering.')
        setState('error')
      })
    }, 250)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return (
    <div className="people-search">
      <label className="field mt-3">
        <span>Find people</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          aria-describedby="people-search-status"
        />
      </label>
      <p id="people-search-status" className="sr-only" aria-live="polite">
        {state === 'done' ? `${results.length} ${results.length === 1 ? 'person' : 'people'} found` : ''}
      </p>
      {state === 'loading' ? <p className="mt-2 text-sm">Searching…</p> : null}
      {state === 'error' ? <p className="mt-2 text-sm save-error" role="alert">{error}</p> : null}
      {state === 'done' && results.length === 0 ? <p className="mt-2 text-sm">No one matches “{query.trim()}”. Try part of their name, or send an invite below.</p> : null}
      {results.length ? (
        <ul className="people-results" aria-label="People">
          {results.map((person) => <PersonRow key={person.id} person={person} />)}
        </ul>
      ) : null}
    </div>
  )
}

export function PersonRow({ person }: { person: FriendProfile }) {
  const app = useApp()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const friend = app.friends.some((item) => item.id === person.id)
  const pending = sent || app.requests.some((request) => request.handle === person.handle && request.direction === 'out')
  const incoming = app.requests.find((request) => request.handle === person.handle && request.direction === 'in')
  return (
    <li className="people-row">
      <Avatar name={person.name} url={person.avatarUrl} size={36} />
      <span className="people-row-name">
        <Link to={`/u/${person.handle}`}>{person.name}</Link>
        <span>@{person.handle}</span>
      </span>
      {friend ? <span className="tag text-xs">Friends</span> : incoming ? (
        <button type="button" className="btn btn-coral text-sm" disabled={busy} onClick={() => {
          setBusy(true)
          void app.respondFriend(incoming.id, true).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not accept.')).finally(() => setBusy(false))
        }}>Accept</button>
      ) : pending ? <span className="tag text-xs">Requested</span> : (
        <button
          type="button"
          className="btn btn-coral text-sm"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            setError('')
            void app.requestFriend(person.handle).then(() => setSent(true)).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not send that.')).finally(() => setBusy(false))
          }}
        >
          {busy ? 'Sending…' : 'Add'}
        </button>
      )}
      {error ? <span className="sr-only" role="alert">{error}</span> : null}
      {error ? <span className="text-xs save-error">{error}</span> : null}
    </li>
  )
}
