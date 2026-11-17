import { useRef, useState } from 'react'
import { Modal } from './Modal.tsx'
import { useApp, type ImportedNote } from '../state/AppState.tsx'
import { Avatar } from './Avatar.tsx'
import { prepareAvatar, type AvatarImage } from '../lib/avatar-image.ts'

function suggestHandle(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]+/g, '').slice(0, 24)
}

function movedLine(note: ImportedNote): string {
  const bits = [
    note.places ? `${note.places} ${note.places === 1 ? 'place' : 'places'}` : '',
    note.guides ? `${note.guides} ${note.guides === 1 ? 'list' : 'lists'}` : '',
    note.ranks ? `${note.ranks} ${note.ranks === 1 ? 'rank' : 'ranks'}` : '',
    note.plans ? `${note.plans} ${note.plans === 1 ? 'plan' : 'plans'}` : '',
    note.photos ? `${note.photos} ${note.photos === 1 ? 'photo' : 'photos'}` : '',
  ].filter(Boolean)
  return `We moved ${bits.join(', ')} from this phone into your account.`
}

/** The name the old name-only sign-in used on this phone, if any. A better default than an email. */
function oldLocalName(): string {
  try {
    const session = JSON.parse(localStorage.getItem('gusto.session.v1') || 'null') as { id?: string; name?: string } | null
    if (session?.id?.startsWith('local-') && session.id !== 'local-augusto' && session.name) return session.name
  } catch {
    /* empty */
  }
  return ''
}

/**
 * Welcome sheet on first sign-in (pick a display name and username), and Edit profile afterwards.
 * Only shown to someone who just signed in, never to a visitor on page load.
 */
export function ProfileSheet({ mode, onClose }: { mode: 'welcome' | 'edit'; onClose: () => void }) {
  const app = useApp()
  const user = app.user
  // New email accounts start as "New member" / @member123456 (set by the database). Do not offer those as a choice.
  const placeholderName = user?.name === 'New member'
  const placeholderHandle = /^member\d{6}\d*$/.test(user?.handle ?? '')
  const accountName = placeholderName ? '' : user?.name || ''
  const startName = mode === 'welcome' ? (oldLocalName() || accountName) : user?.name ?? ''
  const [name, setName] = useState(startName)
  const [handle, setHandle] = useState(
    mode === 'welcome' && oldLocalName() ? suggestHandle(startName) : mode === 'welcome' && placeholderHandle ? '' : user?.handle ?? '',
  )
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const focus = useRef<HTMLInputElement>(null)
  if (!user) return null
  return (
    <Modal onClose={onClose} label={mode === 'welcome' ? 'Set up your profile' : 'Edit profile'} initialFocusRef={focus}>
      <form
        className="p-5"
        data-profile={mode}
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          setBusy(true)
          void app.saveProfile(name, handle).then(() => {
            setBusy(false)
            onClose()
          }).catch((reason: unknown) => {
            setBusy(false)
            setError(reason instanceof Error ? reason.message : 'Could not save your profile.')
          })
        }}
      >
        <h2 className="font-serif text-4xl italic">{mode === 'welcome' ? 'Welcome to Gusto’s Guide' : 'Edit profile'}</h2>
        <p className="mt-2 text-sm">
          {mode === 'welcome'
            ? 'Pick the name and username friends will see. Your lists, ranks, and plans now live on your account, on any device.'
            : 'Friends find you by your username.'}
        </p>
        {mode === 'welcome' && app.imported ? <p className="mt-3 text-sm font-bold" role="status">{movedLine(app.imported)}</p> : null}
        <AvatarPicker name={name || user.name} />
        <label className="field mt-4">
          <span>Display name</span>
          <input
            ref={focus}
            value={name}
            maxLength={80}
            autoComplete="name"
            onChange={(event) => {
              setName(event.target.value)
              if (!touched && mode === 'welcome') setHandle(suggestHandle(event.target.value))
            }}
            required
          />
        </label>
        <label className="field mt-3">
          <span>Username</span>
          <input
            value={handle}
            maxLength={25}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => {
              setTouched(true)
              setHandle(event.target.value.replace(/^@/, '').toLowerCase())
            }}
            required
          />
        </label>
        <p className="mt-1 text-xs">3 to 24 letters, numbers, or underscores.</p>
        {error ? <p className="mt-3 text-sm" role="alert">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="btn btn-coral" disabled={busy}>{mode === 'welcome' ? 'Save profile' : 'Save'}</button>
          <button type="button" className="btn" onClick={onClose}>{mode === 'welcome' ? 'Later' : 'Cancel'}</button>
        </div>
      </form>
    </Modal>
  )
}

/** Choose, change, or remove a profile photo. Shrunk in the browser; a failed upload says so and offers Try again. */
function AvatarPicker({ name }: { name: string }) {
  const app = useApp()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<AvatarImage | null>(null)
  const [done, setDone] = useState('')
  const url = app.user?.avatarUrl
  if (!app.user || app.user.id.startsWith('local-')) return null

  async function save(image: AvatarImage | null) {
    setBusy(true)
    setError('')
    setDone('')
    try {
      await app.setAvatar(image)
      setPending(null)
      setDone(image ? 'Photo saved.' : 'Photo removed.')
    } catch (reason) {
      setPending(image)
      setError(reason instanceof Error ? reason.message : 'Could not save your photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="avatar-picker mt-4 flex items-center gap-3">
      <Avatar name={name} url={url} size={64} />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn text-sm" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Saving…' : url ? 'Change photo' : 'Add a photo'}
          </button>
          {url && !busy ? <button type="button" className="btn text-sm" onClick={() => void save(null)}>Remove</button> : null}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label="Profile photo"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            setBusy(true)
            setError('')
            void prepareAvatar(file).then((image) => save(image)).catch((reason: unknown) => {
              setBusy(false)
              setError(reason instanceof Error ? reason.message : 'Could not read that photo.')
            })
          }}
        />
        {error ? (
          <p className="mt-1 text-sm save-error" role="alert">
            {error}{' '}
            {pending ? <button type="button" className="underline font-bold" onClick={() => void save(pending)}>Try again</button> : null}
          </p>
        ) : done ? <p className="mt-1 text-xs" role="status">{done}</p> : <p className="mt-1 text-xs">Friends see this next to your name.</p>}
      </div>
    </div>
  )
}
