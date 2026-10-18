import { useState } from 'react'
import { Link } from 'react-router-dom'
import { catalog } from '../content/load.ts'
import { usePageMeta } from '../lib/meta.ts'
import { useApp } from '../state/AppState.tsx'

export function MyGuidesPage() {
  const app = useApp()
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  usePageMeta("My guides · Gusto's Guide", 'Lists you make, plus shared demo lists.')
  const mine = app.guides.filter((guide) => !('demo' in guide))
  const shared = app.guides.filter((guide) => 'demo' in guide || guide.shared)
  const matches = catalog.places.filter((place) => query && place.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <h1 className="font-serif text-5xl italic">My guides</h1>
      <p className="mt-2">House guides stay read-only. These lists are yours.</p>
      {app.user ? (
        <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); app.createGuide(title); setTitle('') }}>
          <input className="min-h-11 flex-1 border-2 border-ink bg-cream px-3" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="New list" />
          <button className="btn btn-coral" type="submit">Create</button>
        </form>
      ) : <p className="mt-4">Sign in to make a list.</p>}
      {mine.map((guide) => (
        <section key={guide.id} className="mt-6 border-2 border-ink p-4">
          <h2 className="font-serif text-3xl italic">{guide.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn text-sm" onClick={() => app.shareGuide(guide.id, 'demo-mina')}>Share with Mina · Demo</button>
            <button type="button" className="btn text-sm" onClick={() => app.deleteGuide(guide.id)}>Delete</button>
          </div>
          <ul className="mt-3 space-y-2">
            {guide.placeIds.map((id, index) => {
              const place = catalog.places.find((item) => item.id === id)
              if (!place) return null
              return (
                <li key={id} className="flex items-center justify-between gap-2">
                  <Link to={`/place/${id}`}>{place.name}</Link>
                  <span>
                    <button type="button" className="btn text-sm" disabled={index === 0} onClick={() => app.moveInGuide(guide.id, id, -1)}>Up</button>
                    <button type="button" className="btn text-sm" onClick={() => app.removeFromGuide(guide.id, id)}>Remove</button>
                  </span>
                </li>
              )
            })}
          </ul>
          <label className="field mt-3"><span>Add a place</span><input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <ul>
            {matches.map((place) => (
              <li key={place.id}><button type="button" className="text-sm font-bold" onClick={() => app.addToGuide(guide.id, place.id)}>Add {place.name}</button></li>
            ))}
          </ul>
        </section>
      ))}
      <h2 className="mt-10 font-serif text-4xl italic">Shared</h2>
      <ul className="mt-3 space-y-2">
        {shared.map((guide) => (
          <li key={guide.id}>{guide.title}{guide.shared ? ' · collaborative' : ''} · {guide.placeIds.length} places</li>
        ))}
      </ul>
    </main>
  )
}
