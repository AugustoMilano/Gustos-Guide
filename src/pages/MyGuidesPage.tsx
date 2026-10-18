import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { spotLabel } from '../lib/format.ts'
import { useGuide } from '../state/GuideContext.tsx'

export function MyGuidesPage() {
  const { user, guides, cities, requestSignIn, openSheet, reorderGuides, deleteGuide, renameGuide } = useGuide()
  const dragRef = useRef<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [title, setTitle] = useState('')

  useEffect(() => {
    document.title = "My guides · Gusto's Guide"
  }, [])

  const mine = guides.filter((guide) => guide.kind === 'user')

  return (
    <main id="main" tabIndex={-1} className="mx-auto max-w-3xl px-4 pt-24 pb-16 outline-none">
      <p className="meta-line">On this device</p>
      <h1 className="font-serif text-6xl italic leading-none">My guides</h1>
      <p className="mt-3 max-w-xl">
        Lists you can rename, reorder, and fill. House guides stay read-only.
      </p>
      {!user ? (
        <button type="button" className="btn btn-coral mt-6" onClick={() => requestSignIn({ type: 'create-guide' })}>
          Sign in to start a list
        </button>
      ) : (
        <>
          <button type="button" className="btn btn-coral mt-6" onClick={() => openSheet({ type: 'create-guide' })}>
            New guide
          </button>
          {mine.length === 0 ? (
            <p className="mt-6 font-serif text-2xl italic">No lists yet. The house guides are Gusto's. These would be yours.</p>
          ) : (
            cities
              .filter((city) => mine.some((guide) => guide.cityId === city.id))
              .map((city) => {
                const cityGuides = mine.filter((guide) => guide.cityId === city.id)
                return (
                  <section key={city.id} className="mt-8" aria-labelledby={`city-${city.id}`}>
                    <h2 id={`city-${city.id}`} className="font-serif text-3xl italic">
                      {city.name}
                    </h2>
                    <ul className="mt-3 space-y-3">
                      {cityGuides.map((guide, index) => (
                        <li
                          key={guide.id}
                          className="card flex flex-wrap items-center gap-2 p-3 shadow-none"
                          draggable
                          onDragStart={() => {
                            dragRef.current = guide.id
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => {
                            if (dragRef.current) reorderGuides(city.id, dragRef.current, guide.id)
                            dragRef.current = null
                          }}
                        >
                          {editing === guide.id ? (
                            <form
                              className="flex min-w-0 flex-1 gap-2"
                              onSubmit={(event) => {
                                event.preventDefault()
                                renameGuide(guide.id, title)
                                setEditing(null)
                              }}
                            >
                              <label className="sr-only" htmlFor={`edit-${guide.id}`}>
                                Rename {guide.title}
                              </label>
                              <input
                                id={`edit-${guide.id}`}
                                value={title}
                                onChange={(event) => setTitle(event.target.value)}
                                className="min-h-11 min-w-0 flex-1 border-2 border-ink px-2"
                              />
                              <button type="submit" className="btn text-sm">
                                Save
                              </button>
                            </form>
                          ) : (
                            <Link to={`/my/${guide.id}`} className="min-w-0 flex-1">
                              <span className="block font-serif text-2xl leading-none">{guide.title}</span>
                              <span className="meta-line">{spotLabel(guide.placeIds.length)}</span>
                            </Link>
                          )}
                          <button
                            type="button"
                            className="btn px-2 text-sm"
                            aria-label={`Move ${guide.title} up`}
                            disabled={index === 0}
                            onClick={() => {
                              const previous = cityGuides[index - 1]
                              if (previous) reorderGuides(city.id, guide.id, previous.id)
                            }}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className="btn px-2 text-sm"
                            aria-label={`Move ${guide.title} down`}
                            disabled={index === cityGuides.length - 1}
                            onClick={() => {
                              const next = cityGuides[index + 1]
                              if (next) reorderGuides(city.id, guide.id, next.id)
                            }}
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            className="btn px-2 text-sm"
                            onClick={() => {
                              setEditing(guide.id)
                              setTitle(guide.title)
                            }}
                          >
                            Rename
                          </button>
                          <button type="button" className="btn px-2 text-sm" onClick={() => deleteGuide(guide.id)}>
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })
          )}
        </>
      )}
    </main>
  )
}
