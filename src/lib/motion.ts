export function bounceMark(event: { currentTarget: HTMLElement }) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const button = event.currentTarget
  // Add the class after React re-renders the button (its className changes on toggle), or it gets wiped.
  requestAnimationFrame(() => {
    button.classList.remove('is-pop')
    void button.offsetWidth
    button.classList.add('is-pop')
    button.addEventListener('animationend', () => button.classList.remove('is-pop'), { once: true })
  })
}

export function dragSheet(
  event: { button: number; clientY: number },
  panel: HTMLElement | null,
  onClose: () => void,
) {
  if (event.button !== 0 || !panel) return
  const startY = event.clientY
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const move = (ev: PointerEvent) => {
    const dy = Math.max(0, ev.clientY - startY)
    if (!reduce) panel.style.transform = `translateY(${dy}px)`
  }
  const end = (ev: PointerEvent) => {
    panel.style.transform = ''
    if (ev.clientY - startY > 80) onClose()
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
}
