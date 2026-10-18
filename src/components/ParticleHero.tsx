import { useEffect, useRef, type RefObject } from 'react'

interface Dot {
  x: number
  y: number
  sx: number
  sy: number
  color: string
  size: number
  phase: number
}

const LINES = ["Gusto's", 'Guide']

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function sampleDots(width: number, height: number): Dot[] {
  const off = document.createElement('canvas')
  off.width = width
  off.height = height
  const ctx = off.getContext('2d')
  if (!ctx) return []

  const maxWidth = width * 0.92
  let size = Math.min(height * 0.34, width * 0.2, 168)
  const setFont = (next: number) => {
    ctx.font = `italic ${next}px "Instrument Serif", Georgia, serif`
  }
  setFont(size)
  while (size > 52 && LINES.some((line) => ctx.measureText(line).width > maxWidth)) {
    size -= 2
    setFont(size)
  }

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const lineHeight = size * 0.92
  const block = lineHeight * LINES.length
  const top = height / 2 - block / 2 + lineHeight / 2
  LINES.forEach((line, index) => {
    ctx.fillText(line, width / 2, top + index * lineHeight)
  })

  const gap = width < 520 ? 5 : 7
  const pixels = ctx.getImageData(0, 0, width, height).data
  const dots: Dot[] = []
  let index = 0
  for (let y = 0; y < height; y += gap) {
    for (let x = 0; x < width; x += gap) {
      const alpha = pixels[(y * width + x) * 4 + 3]
      if (alpha < 140) continue
      const angle = (index * 2.399) % (Math.PI * 2)
      const distance = 90 + ((index * 37) % 220)
      const coral = index % 13 === 0
      const blue = index % 17 === 0
      dots.push({
        x,
        y,
        sx: Math.cos(angle) * distance,
        sy: Math.sin(angle) * distance * 0.72,
        color: coral ? '#FF5330' : blue ? '#C9D4F5' : '#F4EDE3',
        size: gap > 5 ? 2.4 : 1.9,
        phase: index * 0.35,
      })
      index += 1
    }
  }
  return dots
}

export function ParticleHero({ progressRef }: { progressRef: RefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let dots: Dot[] = []
    let raf = 0
    let running = true
    let reduce = prefersReduced()
    const started = performance.now()

    const draw = (now: number) => {
      if (!running) return
      const cssWidth = wrap.clientWidth
      const cssHeight = wrap.clientHeight
      if (cssWidth < 20 || cssHeight < 20) {
        raf = requestAnimationFrame(draw)
        return
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.round(cssWidth * dpr)
      const height = Math.round(cssHeight * dpr)
      if (canvas.width !== width || canvas.height !== height || dots.length === 0) {
        canvas.width = width
        canvas.height = height
        dots = sampleDots(width, height)
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const elapsed = Math.min(1, (now - started) / 1600)
      const settle = reduce ? 1 : 1 - (1 - elapsed) ** 3
      const scatter = reduce ? 0 : progressRef.current
      const wobble = reduce ? 0 : 1
      for (const dot of dots) {
        const drift = scatter * 1.35 + (1 - settle)
        const x = dot.x + dot.sx * drift + Math.sin(now / 700 + dot.phase) * 0.6 * wobble * settle
        const y = dot.y + dot.sy * drift + Math.cos(now / 900 + dot.phase) * 0.6 * wobble * settle
        ctx.beginPath()
        ctx.fillStyle = dot.color
        ctx.globalAlpha = 0.35 + 0.65 * settle * (1 - scatter * 0.35)
        ctx.arc(x, y, dot.size * dpr, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (!reduce) raf = requestAnimationFrame(draw)
    }

    const boot = () => {
      cancelAnimationFrame(raf)
      dots = []
      raf = requestAnimationFrame(draw)
    }

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotion = () => {
      reduce = motion.matches
      boot()
    }
    motion.addEventListener('change', onMotion)

    const fonts = document.fonts?.load('italic 140px "Instrument Serif"')
    void Promise.race([
      fonts ?? Promise.resolve(),
      new Promise((resolve) => window.setTimeout(resolve, 1800)),
    ]).then(() => {
      if (running) boot()
    })

    const observer = new ResizeObserver(() => {
      dots = []
      if (reduce) boot()
    })
    observer.observe(wrap)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      observer.disconnect()
      motion.removeEventListener('change', onMotion)
    }
  }, [progressRef])

  return (
    <div ref={wrapRef} className="relative h-[42svh] min-h-56 w-full sm:h-[46svh]">
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
    </div>
  )
}
