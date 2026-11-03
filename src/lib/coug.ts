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

/** A drawn football spirals across the screen. Reduced motion: the message only. */
export function cougSpiral() {
  cougToast("It's game day.")
  if (reduced()) return
  const ball = document.createElement('div')
  ball.className = 'coug-spiral'
  ball.setAttribute('aria-hidden', 'true')
  document.body.appendChild(ball)
  window.setTimeout(() => ball.remove(), 1800)
}

/** Crimson and gray stripes ripple across the top of the page, like a flag in the wind. */
export function cougWave() {
  cougToast("Ol' Crimson is flying.")
  if (reduced()) return
  const flag = document.createElement('div')
  flag.className = 'coug-wave'
  flag.setAttribute('aria-hidden', 'true')
  document.body.appendChild(flag)
  window.setTimeout(() => flag.remove(), 2400)
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
    const text = target.value.trim().toLowerCase().replace(/\s+/g, ' ')
    if (/^go ?cougs!?$/.test(text)) {
      cougBurst()
      found('search')
    } else if (text === 'game day' || text === 'gameday') {
      cougSpiral()
      found('spiral')
    } else if (text === 'crimson') {
      cougWave()
      found('wave')
    }
  })
  let taps = 0
  let first = 0
  let hold = 0
  const title = (event: Event) => {
    const el = event.target instanceof Element ? event.target.closest('.hero h1, main h1') : null
    // The Game day guide's title has its own six-tap touchdown instead.
    const gameDay = /\/guides?\/pul-game-day/.test(location.pathname + location.hash)
    return el && !gameDay && document.documentElement.dataset.area === 'pullman' ? el : null
  }
  // Six taps on the Game day guide's title: a touchdown.
  let tdTaps = 0
  let tdFirst = 0
  document.addEventListener('click', (event) => {
    const el = event.target instanceof Element ? event.target.closest('main h1') : null
    if (!el || !/\/guides?\/pul-game-day/.test(location.pathname + location.hash)) return
    const now = Date.now()
    if (now - tdFirst > 3000) {
      tdFirst = now
      tdTaps = 0
    }
    tdTaps += 1
    if (tdTaps >= 6) {
      tdTaps = 0
      cougBurst('Touchdown! +6')
      found('touchdown')
    }
  })
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
      cougToast("Ol' Crimson.")
      found('hold')
    }, 700)
  })
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) document.addEventListener(type, () => window.clearTimeout(hold))
}
