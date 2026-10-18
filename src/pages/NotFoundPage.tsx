import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-28 outline-none">
      <h1 className="font-serif text-5xl italic">That page is not on the menu.</h1>
      <Link to="/" className="btn mt-6">Back to Seattle</Link>
    </main>
  )
}
