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

export function SignInSheet({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string }) {
  const { signIn, sendMagicLink, verifyEmailCode, signInProvider, accounts, authProviders } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const xFocus = useRef<HTMLButtonElement>(null)
  const fieldFocus = useRef<HTMLInputElement>(null)
  const xOn = accounts && authProviders.includes('x')
  if (!open) return null
  const fail = (reason: unknown) => {
    setBusy(false)
    setError(reason instanceof Error ? reason.message : 'Could not sign in.')
  }
  const send = () => {
    setError('')
    setBusy(true)
    void sendMagicLink(email).then(() => {
      setBusy(false)
      setSent(true)
    }).catch(fail)
  }
  if (accounts && sent) {
    return (
      <Modal onClose={onClose} label="Check your email" initialFocusRef={fieldFocus as RefObject<HTMLElement | null>}>
        <form
          className="p-5"
          data-auth="code"
          onSubmit={(event) => {
            event.preventDefault()
            setError('')
            setBusy(true)
            void verifyEmailCode(email, code).then(onClose).catch(fail)
          }}
        >
          <h2 className="font-serif text-4xl italic">Check your email</h2>
          <p className="mt-2 text-sm" role="status">
            We sent a sign-in link and a code to <strong>{email.trim()}</strong>. Tap the link, or type the code here.
          </p>
          <label className="field mt-4">
            <span>Code</span>
            <input
              ref={fieldFocus}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>
          {error ? <p className="mt-3 text-sm" role="alert">{error}</p> : null}
          <button type="submit" className="btn btn-coral mt-4" disabled={busy}>Sign in</button>
          <p className="mt-4 flex flex-wrap gap-4 text-sm">
            <button type="button" className="underline" disabled={busy} onClick={send}>Send again</button>
            <button type="button" className="underline" onClick={() => { setSent(false); setCode(''); setError('') }}>Use another email</button>
          </p>
        </form>
      </Modal>
    )
  }
  return (
    <Modal onClose={onClose} label="Sign in" initialFocusRef={(xOn ? xFocus : fieldFocus) as RefObject<HTMLElement | null>}>
      <form
        className="p-5"
        data-auth={accounts ? 'magic' : 'local'}
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          if (!accounts) {
            void signIn(name).then(onClose).catch(fail)
            return
          }
          send()
        }}
      >
        <h2 className="font-serif text-4xl italic">Sign in</h2>
        <p className="mt-2 text-sm">
          {reason ?? (accounts
            ? 'Your profile, lists, and ranks are saved to your account, so they are there on any phone or computer. No password needed.'
            : 'Your name and lists stay on this phone.')}
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
        {accounts ? (
          <label className="field mt-4">
            <span>{xOn ? 'Or email' : 'Email'}</span>
            <input ref={xOn ? undefined : fieldFocus} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
        ) : (
          <label className="field mt-4">
            <span>Name</span>
            <input ref={fieldFocus} value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
        )}
        {error ? <p className="mt-3 text-sm" role="alert">{error}</p> : null}
        <button type="submit" className="btn btn-coral mt-4" disabled={busy}>
          {accounts ? 'Email me a sign-in link' : 'Sign in'}
        </button>
        {accounts ? <p className="mt-3 text-xs">Anything you saved on this phone before moves into your account.</p> : null}
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
