import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearRecent, readRecent, rememberSearch } from '../lib/recent-search.ts'
import { smartSearch } from '../lib/smart-search.ts'
import { useApp } from '../state/AppState.tsx'
import { useCityId } from '../lib/use-city-id.ts'
import type { GuideSummary, SlimPlace } from '../types.ts'
import { MatchText } from './MatchText.tsx'

type Hit = { key: string; label: string; detail: string; href: string }

export function SearchField({
  id,
  label,
  value,
  onChange,
  onSubmit,
  className = '',
  inputClassName = 'glass-input w-full px-3 py-2',
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  className?: string
  inputClassName?: string
}) {
  const city = useCityId()
  const navigate = useNavigate()
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [places, setPlaces] = useState<SlimPlace[] | null>(null)
  const [guides, setGuides] = useState<GuideSummary[] | null>(null)
  const [recents, setRecents] = useState<string[]>(() => readRecent())
  const root = useRef<HTMLFormElement>(null)
  const query = value.trim().toLowerCase()

  function loadCatalog() {
    if (places) return
    void import('../content/load.ts').then(async (mod) => {
      await mod.catalogReady
      setPlaces(mod.catalog.places)
      setGuides(mod.catalog.guides)
    })
  }

  const { gustoScore } = useApp()
  const hits = useMemo(() => {
    if (!query || !places || !guides) return []
    const found = smartSearch(query, city, places, guides, gustoScore)
    const rows = [...found.guides, ...found.places, ...found.suggestions].slice(0, 8)
    return rows.map((hit) => ({
      key: `${hit.kind}-${hit.id}`,
      label: hit.title,
      detail: hit.why,
      href: hit.href,
    }))
  }, [gustoScore, query, places, guides, city])

  const rows: Hit[] = query
    ? hits
    : recents.map((item) => ({ key: `recent-${item}`, label: item, detail: 'Recent', href: '' }))

  useEffect(() => {
    if (active < 0) return
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, listId])

  function choose(index: number) {
    const hit = rows[index]
    if (!hit) {
      const next = value.trim()
      if (next) setRecents(rememberSearch(next))
      onSubmit(next)
      setOpen(false)
      return
    }
    if (!hit.href) {
      onChange(hit.label)
      setRecents(rememberSearch(hit.label))
      onSubmit(hit.label)
      setOpen(false)
      return
    }
    setRecents(rememberSearch(query ? value : hit.label))
    setOpen(false)
    onChange('')
    navigate(hit.href)
  }

  return (
    <form
      ref={root}
      className={`search-field ${className}`}
      onSubmit={(event) => {
        event.preventDefault()
        choose(active)
      }}
    >
      <label className="sr-only" htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        aria-expanded={open && rows.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        placeholder="Search"
        className={inputClassName}
        autoComplete="off"
        onFocus={() => {
          loadCatalog()
          setOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => {
            if (!root.current?.contains(document.activeElement)) setOpen(false)
          }, 120)
        }}
        onChange={(event) => {
          onChange(event.target.value)
          setActive(-1)
          setOpen(true)
          loadCatalog()
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setOpen(true)
            setActive((index) => Math.min(rows.length - 1, index + 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((index) => Math.max(-1, index - 1))
          } else if (event.key === 'Escape') {
            setOpen(false)
            setActive(-1)
          }
        }}
      />
      {open && rows.length ? (
        <div className="search-pop">
          <div id={listId} role="listbox" aria-label={query ? 'Matches' : 'Recent searches'}>
            {rows.map((hit, index) => (
              <button
                key={hit.key}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === active}
                className={index === active ? 'is-active' : undefined}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span className="block truncate font-serif text-xl italic leading-tight"><MatchText text={hit.label} query={query} /></span>
                <span className="block truncate text-xs font-bold tracking-wide uppercase">{hit.detail}</span>
              </button>
            ))}
          </div>
          {!query && recents.length ? (
            <button
              type="button"
              className="search-clear"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                clearRecent()
                setRecents([])
              }}
            >
              Clear recent searches
            </button>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
