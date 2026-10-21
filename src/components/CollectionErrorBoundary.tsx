import { Component, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cityPath } from '../lib/city.ts'

type State = { failed: boolean }

/** Keeps a collection render error on this page instead of blanking the app. */
export class CollectionErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
        <h1 className="font-serif text-5xl italic">This collection didn't open.</h1>
        <p className="mt-3">The rest of the guide is still there.</p>
        <Link to={cityPath('/')} className="btn mt-6">Home</Link>
      </main>
    )
  }
}
