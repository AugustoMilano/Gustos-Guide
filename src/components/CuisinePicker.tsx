import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cuisineMenuLabel } from '../lib/cuisine-label.ts'

type Choice = { value: string; label: string }

type Props = {
  labelId: string
  value: string
  options?: readonly string[]
  /** Full list, including the empty choice. Used when the stored value is not the label. */
  choices?: readonly Choice[]
  anyValue?: string
  anyLabel?: string
  searchLabel?: string
  emptyLabel?: string
  onChange: (value: string) => void
}

export function CuisinePicker({ labelId, value, options = [], choices, anyValue = 'any', anyLabel = 'Any', searchLabel = 'Find a cuisine', emptyLabel = 'No cuisines match.', onChange }: Props) {
  const listId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rows = useMemo<Choice[]>(() => {
    if (choices) return [...choices]
    return [{ value: anyValue, label: anyLabel }, ...options.map((item) => ({ value: item, label: cuisineMenuLabel(item, options) }))]
  }, [anyLabel, anyValue, choices, options])
  const current = rows.find((row) => row.value === value)?.label ?? anyLabel
  const visible = useMemo<Choice[]>(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) => row.label.toLowerCase().includes(needle) || row.value.toLowerCase().includes(needle))
  }, [query, rows])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => searchRef.current?.focus())
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointer = (event: Event) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer, true)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer, true)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const button = buttonRef.current
      const menu = menuRef.current
      if (!button || !menu) return
      const rect = button.getBoundingClientRect()
      const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0
      const dock = document.querySelector('nav.lg-dock')
      let limitBottom = window.innerHeight
      if (dock instanceof HTMLElement && getComputedStyle(dock).display !== 'none') {
        const top = dock.getBoundingClientRect().top
        if (top > headerBottom && top < limitBottom) limitBottom = top
      }
      const margin = 8
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - margin * 2)
      let left = rect.left
      if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width
      if (left < margin) left = margin
      const spaceBelow = limitBottom - rect.bottom - margin
      const spaceAbove = rect.top - headerBottom - margin
      const openBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove
      const maxHeight = Math.max(120, Math.min(280, openBelow ? spaceBelow : spaceAbove))
      const top = openBelow ? rect.bottom + 4 : Math.max(headerBottom + margin, rect.top - 4 - maxHeight)
      menu.style.left = `${Math.round(left)}px`
      menu.style.top = `${Math.round(top)}px`
      menu.style.width = `${Math.round(width)}px`
      menu.style.maxHeight = `${Math.round(maxHeight)}px`
    }
    place()
    window.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      document.removeEventListener('scroll', place, true)
    }
  }, [open, visible.length])

  function openMenu() {
    const index = rows.findIndex((row) => row.value === value)
    setQuery('')
    setActive(index < 0 ? 0 : index)
    setOpen(true)
  }

  function choose(next: string) {
    onChange(next)
    setOpen(false)
    buttonRef.current?.focus()
  }

  function onSearchKey(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => Math.min(visible.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => Math.max(0, index - 1))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActive(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActive(Math.max(0, visible.length - 1))
    } else if (event.key === 'Enter' && visible[active]) {
      event.preventDefault()
      choose(visible[active].value)
    }
  }

  useEffect(() => {
    if (!open) return
    const node = menuRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    node?.scrollIntoView({ block: 'nearest' })
  }, [active, open, visible])

  const activeId = visible.length ? `${listId}-opt-${active}` : undefined

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="cuisine-picker-button"
        aria-labelledby={`${labelId} ${listId}-value`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            openMenu()
          }
        }}
      >
        <span id={`${listId}-value`} className="cuisine-picker-value">{current}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16"><path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </button>
      {open ? createPortal(
        <div ref={menuRef} className="cuisine-menu">
          <input
            ref={searchRef}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeId}
            aria-label={searchLabel}
            placeholder={searchLabel}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
            }}
            onKeyDown={onSearchKey}
          />
          <div id={listId} role="listbox" aria-labelledby={labelId}>
            {visible.length ? visible.map((row, index) => (
              <button
                key={row.value}
                id={`${listId}-opt-${index}`}
                type="button"
                role="option"
                aria-selected={row.value === value}
                data-active={index === active ? 'true' : undefined}
                data-value={row.value}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(row.value)}
              >
                {row.label}
              </button>
            )) : <p className="cuisine-menu-empty">{emptyLabel}</p>}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  )
}
