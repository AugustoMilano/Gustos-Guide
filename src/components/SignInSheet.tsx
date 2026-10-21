import { useRef, useState, type RefObject } from 'react'
import { Modal } from './Modal.tsx'
import { useApp } from '../state/AppState.tsx'

function XLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  )
}

export function SignInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, sendMagicLink, signInProvider, supabase, authProviders } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const xFocus = useRef<HTMLButtonElement>(null)
  const fieldFocus = useRef<HTMLInputElement>(null)
  const xOn = supabase && authProviders.includes('x')
  if (!open) return null
  const fail = (reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not sign in.')
  return (
    <Modal onClose={onClose} label="Sign in" initialFocusRef={(xOn ? xFocus : fieldFocus) as RefObject<HTMLElement | null>}>
      <form
        className="p-5"
        data-auth={supabase ? 'magic' : 'local'}
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          if (!supabase) {
            void signIn(name).then(onClose).catch(fail)
            return
          }
          void sendMagicLink(email).then(() => setSent(true)).catch(fail)
        }}
      >
        <h2 className="font-serif text-4xl italic">Sign in</h2>
        <p className="mt-2 text-sm">
          {supabase
            ? xOn
              ? 'Continue with X, or email yourself a sign-in link. It opens back on Gusto’s Guide.'
              : 'We’ll email you a sign-in link. It opens back on Gusto’s Guide.'
            : 'Your name stays on this phone. Sign in as Augusto for house photos.'}
        </p>
        {xOn ? (
          <button
            ref={xFocus}
            type="button"
            className="btn btn-x mt-4"
            onClick={() => {
              setError('')
              void signInProvider('x').catch(fail)
            }}
          >
            <XLogo />
            Continue with X
          </button>
        ) : null}
        {supabase ? (
          <label className={`field ${xOn ? 'mt-4' : 'mt-4'}`}>
            <span>{xOn ? 'Or email' : 'Email'}</span>
            <input ref={xOn ? undefined : fieldFocus} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
        ) : (
          <label className="field mt-4">
            <span>Name</span>
            <input ref={fieldFocus} value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
        )}
        {sent ? <p className="mt-3 text-sm" role="status">Check your email for a sign-in link. It opens back on this guide.</p> : null}
        {error ? <p className="mt-3 text-sm" role="alert">{error}</p> : null}
        <button type="submit" className="btn btn-coral mt-4">
          {supabase ? 'Email me a link' : 'Sign in'}
        </button>
        {authProviders.includes('google') ? (
          <button type="button" className="btn mt-3" onClick={() => void signInProvider('google').catch(fail)}>
            Sign in with Google
          </button>
        ) : null}
        {authProviders.includes('apple') ? (
          <button type="button" className="btn mt-3" onClick={() => void signInProvider('apple').catch(fail)}>
            Sign in with Apple
          </button>
        ) : null}
      </form>
    </Modal>
  )
}
