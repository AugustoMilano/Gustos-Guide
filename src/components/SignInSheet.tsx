import { useRef, useState } from 'react'
import { Modal } from './Modal.tsx'
import { useApp } from '../state/AppState.tsx'

export function SignInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signIn, signInEmail, supabase } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const focus = useRef<HTMLInputElement>(null)
  if (!open) return null
  return (
    <Modal onClose={onClose} label="Sign in" initialFocusRef={focus}>
      <form
        className="p-5"
        onSubmit={(event) => {
          event.preventDefault()
          setError('')
          const run = supabase ? signInEmail(email, password, false) : signIn(name)
          void run.then(onClose).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Could not sign in.'))
        }}
      >
        <h2 className="font-serif text-4xl italic">Sign in</h2>
        <p className="mt-2 text-sm">
          {supabase
            ? 'This browser is pointed at Supabase. Use the email on that project.'
            : 'Your name stays on this phone. Sign in as Augusto for house photos.'}
        </p>
        {supabase ? (
          <>
            <label className="field mt-4">
              <span>Email</span>
              <input ref={focus} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="field mt-3">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
          </>
        ) : (
          <label className="field mt-4">
            <span>Name</span>
            <input ref={focus} value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
        )}
        {error ? <p className="mt-3 text-sm">{error}</p> : null}
        <button type="submit" className="btn btn-coral mt-4">
          Sign in
        </button>
      </form>
    </Modal>
  )
}
