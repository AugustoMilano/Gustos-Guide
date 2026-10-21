import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cityPath } from '../lib/city.ts'
import { cleanTitle, collectionsForCity, flagshipAimHint, suggestionsFor } from '../lib/collections.ts'
import { useCityCatalog } from '../lib/use-city.ts'
import { COLLECTIONS_MIGRATION } from '../social/collection-store.ts'
import { useApp } from '../state/AppState.tsx'

export function OwnerCollections() {
  const app = useApp()
  const { city, places } = useCityCatalog()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftNote, setDraftNote] = useState('')
  if (!app.user?.isOwner) return null
  const mine = collectionsForCity(app.collections, city)
  const suggestions = suggestionsFor(places, city, app.gustoScore, mine.map((row) => row.title))
  const status = app.collectionsStatus === 'missing'
    ? `Apply ${COLLECTIONS_MIGRATION} on the house account.`
    : app.collectionsStatus === 'offline'
      ? 'Not connected to the account.'
      : app.collectionsStatus === 'error'
        ? app.collectionsMessage
        : ''

  return (
    <div className="glass mt-4 p-4">
      <h3 className="font-serif text-2xl italic">House</h3>
      {status ? <p className="mt-2 text-sm" role="status">{status}</p> : null}
      <form
        className="mt-3 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void app.createCollection(city, title, note).then((id) => {
            if (!id) return
            setTitle('')
            setNote('')
          })
        }}
      >
        <label className="field">
          <span>Title</span>
          <input value={title} maxLength={40} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span>Note</span>
          <textarea value={note} maxLength={280} rows={2} onChange={(event) => setNote(event.target.value)} />
        </label>
        <button type="submit" className="btn btn-coral" disabled={!cleanTitle(title)}>Create</button>
      </form>
      {mine.length ? (
        <ul className="mt-4 space-y-3">
          {mine.map((row) => (
            <li key={row.id} className="border-t border-ink/15 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link className="font-bold" to={cityPath(`/collection/${row.slug}`)}>{row.title}</Link>
                <span className="text-sm">{flagshipAimHint(row.placeIds.length)}</span>
                {row.published ? null : <span className="text-sm">Not published</span>}
                <button
                  type="button"
                  className="btn text-sm"
                  onClick={() => {
                    setEditing(row.id)
                    setDraftTitle(row.title)
                    setDraftNote(row.blurb ?? '')
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="btn text-sm"
                  onClick={() => {
                    if (confirmId === row.id) {
                      setConfirmId(null)
                      void app.deleteCollection(row.id)
                      return
                    }
                    setConfirmId(row.id)
                  }}
                >
                  {confirmId === row.id ? 'Delete this collection' : 'Delete'}
                </button>
              </div>
              {editing === row.id ? (
                <form
                  className="mt-3 grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void app.renameCollection(row.id, draftTitle, draftNote).then((ok) => {
                      if (ok) setEditing(null)
                    })
                  }}
                >
                  <label className="field">
                    <span>Title</span>
                    <input value={draftTitle} maxLength={40} onChange={(event) => setDraftTitle(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Note</span>
                    <textarea value={draftNote} maxLength={280} rows={2} onChange={(event) => setDraftNote(event.target.value)} />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn btn-coral text-sm" disabled={!cleanTitle(draftTitle)}>Save</button>
                    <button type="button" className="btn text-sm" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              ) : row.blurb ? <p className="mt-2 text-sm">{row.blurb}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {suggestions.length ? (
        <div className="mt-4">
          <h4 className="text-sm font-bold">Suggestions</h4>
          <ul className="mt-2 max-h-64 space-y-2 overflow-auto">
            {suggestions.map((suggestion) => (
              <li key={suggestion.key} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{suggestion.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm">{flagshipAimHint(suggestion.placeIds.length)}</span>
                  <button
                    type="button"
                    className="btn text-sm"
                    onClick={() => void app.createCollection(city, suggestion.title, '', suggestion.placeIds)}
                  >
                    Accept
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
