import { useEffect, useRef } from 'react'

type Dot = { x: number; y: number; r: number; color: string; phase: number }

function prefersReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ParticleHero() {
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

    const layout = () => {
      const cssWidth = wrap.clientWidth
      const cssHeight = wrap.clientHeight
      if (cssWidth < 20 || cssHeight < 20) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(cssWidth * dpr)
      canvas.height = Math.round(cssHeight * dpr)
      const gap = cssWidth < 640 ? 14 : 18
      const next: Dot[] = []
      let index = 0
      for (let y = gap; y < canvas.height; y += gap * dpr) {
        for (let x = gap; x < canvas.width; x += gap * dpr) {
          const coral = index % 11 === 0
          const blue = index % 7 === 0
          next.push({
            x,
            y,
            r: (coral ? 2.4 : 1.6) * dpr,
            color: coral ? '#FF5330' : blue ? '#C9D4F5' : '#F4EDE3',
            phase: index * 0.35,
          })
          index += 1
        }
      }
      dots = next
    }

    const draw = (now: number) => {
      if (!running) return
      if (!dots.length) layout()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const dot of dots) {
        const y = dot.y + Math.sin(now / 900 + dot.phase) * (reduce ? 0 : 4)
        ctx.beginPath()
        ctx.fillStyle = dot.color
        ctx.globalAlpha = 0.55
        ctx.arc(dot.x, y, dot.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (!reduce) raf = requestAnimationFrame(draw)
    }

    layout()
    raf = requestAnimationFrame(draw)
    const observer = new ResizeObserver(() => {
      layout()
      if (reduce) draw(performance.now())
    })
    observer.observe(wrap)
    return () => {
      running = false
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
