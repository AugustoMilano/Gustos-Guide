export function bounceMark(event: { currentTarget: HTMLElement }) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const button = event.currentTarget
  button.classList.remove('is-pop')
  void button.offsetWidth
  button.classList.add('is-pop')
}
