/** Pullman, WA Easter eggs for Coug game days: colors and text only, no marks. Never touches scores or places. */
const COLORS = ['#981e32', '#c8102e', '#5e6a71', '#a7a9ac', '#fffaf3']
const FOUND_KEY = 'gusto.coug.eggs.v1'
let installed = false
let lastArea = ''

function reduced(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Easter eggs found in this browser: 'search', 'taps', 'hold', 'border'. */
export function cougEggsFound(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(FOUND_KEY) || '[]')
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function found(egg: string) {
  try {
    const list = cougEggsFound()
    if (list.includes(egg)) return
    list.push(egg)
    localStorage.setItem(FOUND_KEY, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('gusto:coug-egg', { detail: egg }))
  } catch {
    /* private mode */
  }
}

export function cougToast(text: string) {
  let node = document.querySelector<HTMLElement>('.coug-toast')
  if (!node) {
    node = document.createElement('div')
    node.className = 'coug-toast'
    node.setAttribute('role', 'status')
    node.setAttribute('aria-live', 'polite')
    document.body.appendChild(node)
  }
  node.textContent = text
  node.classList.remove('is-on')
  void node.offsetWidth
  node.classList.add('is-on')
  window.setTimeout(() => node?.classList.remove('is-on'), 2200)
}

export function cougBurst(text = 'Go Cougs!') {
  cougToast(text)
  if (reduced()) return
  const layer = document.createElement('div')
  layer.className = 'coug-confetti'
  layer.setAttribute('aria-hidden', 'true')
  for (let i = 0; i < 70; i++) {
    const bit = document.createElement('i')
    bit.style.left = `${Math.random() * 100}%`
    bit.style.background = COLORS[i % COLORS.length]
    bit.style.animationDelay = `${Math.random() * 0.35}s`
    bit.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`)
    bit.style.setProperty('--spin', `${Math.round(Math.random() * 720)}deg`)
    layer.appendChild(bit)
  }
  document.body.appendChild(layer)
  window.setTimeout(() => layer.remove(), 2600)
}

/** Called whenever the open area changes. */
export function cougArea(area: string) {
  if (lastArea === 'pullman' && area === 'moscow') {
    cougToast('Crossing the border. Passport not required.')
    found('border')
  }
  lastArea = area
}

export function installCougEggs() {
  if (installed || typeof document === 'undefined') return
  installed = true
  lastArea = document.documentElement.dataset.area || ''
  document.addEventListener('input', (event) => {
    const target = event.target
    if (!(target instanceof HTMLInputElement)) return
    if (/^\s*go\s*cougs!?\s*$/i.test(target.value)) {
      cougBurst()
      found('search')
    }
  })
  let taps = 0
  let first = 0
  let hold = 0
  const title = (event: Event) => {
    const el = event.target instanceof Element ? event.target.closest('.hero h1, main h1') : null
    return el && document.documentElement.dataset.area === 'pullman' ? el : null
  }
  document.addEventListener('click', (event) => {
    if (!title(event)) return
    const now = Date.now()
    if (now - first > 2500) {
      first = now
      taps = 0
    }
    taps += 1
    if (taps >= 5) {
      taps = 0
      cougBurst()
      found('taps')
    }
  })
  document.addEventListener('pointerdown', (event) => {
    if (!title(event)) return
    window.clearTimeout(hold)
    hold = window.setTimeout(() => {
      cougToast('Wave the flag.')
      found('hold')
    }, 700)
  })
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) document.addEventListener(type, () => window.clearTimeout(hold))
}
