import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const stack: string[] = []
let locks = 0

function lockBody() {
  locks += 1
  if (locks === 1) document.body.style.overflow = 'hidden'
}

function unlockBody() {
  locks = Math.max(0, locks - 1)
  if (locks === 0) document.body.style.overflow = ''
}

export function Modal({
  onClose,
  children,
  label,
  labelId,
  initialFocusRef,
  className = '',
  wide = false,
}: {
  onClose: () => void
  children: ReactNode
  label?: string
  labelId?: string
  initialFocusRef?: RefObject<HTMLElement | null>
  className?: string
  wide?: boolean
}) {
  const reactId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const id = reactId
    stack.push(id)
    lockBody()
    const previously = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const focusTarget = initialFocusRef?.current ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
    focusTarget?.focus()

    const isTop = () => stack[stack.length - 1] === id

    const onKey = (event: KeyboardEvent) => {
      if (!isTop() || !panelRef.current) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.tabIndex !== -1 && !element.hasAttribute('disabled'),
      )
      if (!items.length) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const onFocusIn = (event: FocusEvent) => {
      if (!isTop() || !panelRef.current) return
      if (!panelRef.current.contains(event.target as Node)) {
        panelRef.current.querySelector<HTMLElement>(FOCUSABLE)?.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      const index = stack.lastIndexOf(id)
      if (index >= 0) stack.splice(index, 1)
      unlockBody()
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocusIn)
      previously?.focus()
    }
  }, [initialFocusRef, reactId])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/60"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={labelId ? undefined : label}
        aria-labelledby={labelId}
        className={`relative max-h-[100dvh] w-full overflow-y-auto border-ink bg-cream text-ink shadow-[8px_8px_0_#181818] sm:max-h-[90dvh] sm:border-2 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
