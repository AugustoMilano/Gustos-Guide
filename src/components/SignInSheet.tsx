import { useRef, useState } from 'react'
import { Modal } from './Modal.tsx'
import { useApp } from '../state/AppState.tsx'

export function SignInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, sendMagicLink, signInProvider, supabase, authProviders } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const focus = useRef<HTMLInputElement>(null)
  if (!open) return null
  return (
    <Modal onClose={onClose} label="Sign in" initialFocusRef={focus}>
      <form
        className="p-5"
        data-auth={supabase ? 'magic' : 'local'}
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          if (!supabase) {
            void signIn(name).then(onClose).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not sign in.'))
            return
          }
          void sendMagicLink(email)
            .then(() => setSent(true))
            .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not send the link.'))
        }}
      >
        <h2 className="font-serif text-4xl italic">Sign in</h2>
        <p className="mt-2 text-sm">
          {supabase
            ? 'We’ll email you a sign-in link. It opens back on Gusto’s Guide.'
            : 'Your name stays on this phone. Sign in as Augusto for house photos.'}
        </p>
        {supabase ? (
          <label className="field mt-4">
            <span>Email</span>
            <input ref={focus} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
        ) : (
          <label className="field mt-4">
            <span>Name</span>
            <input ref={focus} value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
        )}
        {sent ? <p className="mt-3 text-sm">Check your email for a sign-in link.</p> : null}
        {error ? <p className="mt-3 text-sm">{error}</p> : null}
        <button type="submit" className="btn btn-coral mt-4">
          {supabase ? 'Email me a link' : 'Sign in'}
        </button>
        {authProviders.includes('google') ? (
          <button type="button" className="btn mt-3" onClick={() => void signInProvider('google').catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not sign in.'))}>
            Sign in with Google
          </button>
        ) : null}
        {authProviders.includes('apple') ? (
          <button type="button" className="btn mt-3" onClick={() => void signInProvider('apple').catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not sign in.'))}>
            Sign in with Apple
          </button>
        ) : null}
      </form>
    </Modal>
  )
}
