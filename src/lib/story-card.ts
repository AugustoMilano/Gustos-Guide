import { forkSvg, type ForkMetal } from './fork-mark.ts'

const W = 1080
const H = 1920
const NAVY = '#141f4d'
const CREAM = '#fffaf3'
const CREAM_DIM = '#eee3d6'
const CORAL = '#ff5330'

export type StoryPlace = {
  name: string
  neighborhood: string
  cuisine?: string
  photoUrl?: string
  credit?: string
  license?: string
  score: number | null
  award: { rank: number; metal: ForkMetal } | null
}

export type StoryItem = {
  name: string
  neighborhood: string
  score: number | null
  metal: ForkMetal | null
}

const forkCache = new Map<string, HTMLImageElement>()

async function loadFonts() {
  await document.fonts.load('italic 120px "Instrument Serif"')
  await document.fonts.load('700 28px "Instrument Sans"')
  await document.fonts.ready
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const image = new Image()
    if (/^https?:/i.test(url) && !url.startsWith(location.origin)) image.crossOrigin = 'anonymous'
    image.src = url
    await image.decode()
    return image
  } catch {
    return null
  }
}

async function loadFork(metal: ForkMetal, gem: boolean): Promise<HTMLImageElement> {
  const key = `${metal}:${gem ? 1 : 0}`
  const cached = forkCache.get(key)
  if (cached) return cached
  const svg = forkSvg(metal, { id: key.replace(/[^a-z0-9]/gi, ''), gem })
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const image = new Image()
  image.src = url
  await image.decode()
  forkCache.set(key, image)
  return image
}

function canvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const node = document.createElement('canvas')
  node.width = W
  node.height = H
  const ctx = node.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable')
  return { canvas: node, ctx }
}

function blobOf(node: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    node.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not draw the story'))), 'image/png')
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > max && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function cover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number, radius: number) {
  const scale = Math.max(w / image.width, h / image.height)
  const dw = image.width * scale
  const dh = image.height * scale
  ctx.save()
  roundRect(ctx, x, y, w, h, radius)
  ctx.clip()
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  const fade = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h)
  fade.addColorStop(0, 'rgba(20, 31, 77, 0)')
  fade.addColorStop(1, 'rgba(20, 31, 77, 0.55)')
  ctx.fillStyle = fade
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}

function frame(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(238, 227, 214, 0.28)'
  ctx.lineWidth = 2
  roundRect(ctx, 36, 36, W - 72, H - 72, 28)
  ctx.stroke()
  ctx.fillStyle = CREAM
  ctx.font = 'italic 64px "Instrument Serif", Georgia, serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText("Gusto's Guide", 84, 148)
  ctx.fillStyle = CORAL
  ctx.fillRect(84, 172, 92, 8)
}

async function drawFork(ctx: CanvasRenderingContext2D, metal: ForkMetal, gem: boolean, x: number, y: number, w: number) {
  const image = await loadFork(metal, gem)
  ctx.drawImage(image, x, y, w, w * 1.25)
}

export async function renderPlaceStory(place: StoryPlace): Promise<Blob> {
  await loadFonts()
  const { canvas: node, ctx } = canvas()
  frame(ctx)
  const photo = place.photoUrl ? await loadImage(place.photoUrl) : null
  const x = 84
  const y = 214
  const w = W - 168
  const h = 860
  if (photo) {
    cover(ctx, photo, x, y, w, h, 32)
  } else {
    ctx.save()
    roundRect(ctx, x, y, w, h, 32)
    ctx.clip()
    ctx.fillStyle = '#0c1438'
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(255, 250, 243, 0.14)'
    ctx.font = 'italic 180px "Instrument Serif", Georgia, serif'
    ctx.textAlign = 'center'
    const mark = place.cuisine || place.neighborhood || 'Gusto'
    ctx.fillText(mark.slice(0, 18), W / 2, y + h / 2)
    ctx.restore()
  }
  if (place.award) {
    ctx.strokeStyle = place.award.metal === 'silver' ? '#d5dde6' : place.award.metal === 'bronze' ? '#e0a36a' : '#f0d078'
    ctx.lineWidth = 6
    roundRect(ctx, x, y, w, h, 32)
    ctx.stroke()
  }

  let cursor = y + h + 86
  ctx.fillStyle = CREAM
  ctx.textAlign = 'left'
  ctx.font = 'italic 92px "Instrument Serif", Georgia, serif'
  let nameLines = wrap(ctx, place.name, w)
  if (nameLines.length > 3) {
    ctx.font = 'italic 72px "Instrument Serif", Georgia, serif'
    nameLines = wrap(ctx, place.name, w).slice(0, 3)
  }
  for (const line of nameLines.slice(0, 3)) {
    ctx.fillText(line, x, cursor)
    cursor += nameLines.length > 2 ? 78 : 96
  }
  if (place.neighborhood) {
    ctx.fillStyle = CREAM_DIM
    ctx.font = '700 28px "Instrument Sans", sans-serif'
    ctx.fillText(place.neighborhood.toUpperCase(), x, cursor + 8)
    cursor += 64
  }
  if (typeof place.score === 'number') {
    ctx.fillStyle = CORAL
    ctx.font = '700 22px "Instrument Sans", sans-serif'
    ctx.fillText("GUSTO'S SCORE", x, cursor + 20)
    ctx.fillStyle = CREAM
    ctx.font = 'italic 120px "Instrument Serif", Georgia, serif'
    ctx.fillText(place.score.toFixed(1), x, cursor + 140)
  }
  if (place.award) {
    await drawFork(ctx, place.award.metal, place.award.rank === 1, W - 84 - 210, cursor + 10, 180)
    ctx.fillStyle = CREAM
    ctx.font = '700 24px "Instrument Sans", sans-serif'
    ctx.textAlign = 'center'
    const caption = place.award.metal === 'brushed' ? 'TOP 25' : `#${place.award.rank}`
    ctx.fillText(caption, W - 84 - 120, cursor + 250)
    ctx.textAlign = 'left'
  }
  const credit = place.credit && place.credit !== 'Illustration' ? `Photo · ${place.credit}${place.license ? ` · ${place.license}` : ''}` : ''
  ctx.fillStyle = 'rgba(238, 227, 214, 0.72)'
  ctx.font = '500 22px "Instrument Sans", sans-serif'
  if (credit) {
    const line = credit.length > 78 ? `${credit.slice(0, 76)}…` : credit
    ctx.fillText(line, x, H - 148)
  }
  ctx.fillStyle = CORAL
  ctx.font = '700 32px "Instrument Sans", sans-serif'
  ctx.fillText('gustosguide.com', x, H - 88)
  return blobOf(node)
}

export async function renderGuideStory(guide: { title: string; items: StoryItem[] }): Promise<Blob> {
  await loadFonts()
  const { canvas: node, ctx } = canvas()
  frame(ctx)
  ctx.fillStyle = CREAM_DIM
  ctx.font = '700 22px "Instrument Sans", sans-serif'
  ctx.fillText('A GUIDE', 84, 230)
  ctx.fillStyle = CREAM
  ctx.font = 'italic 84px "Instrument Serif", Georgia, serif'
  const titleLines = wrap(ctx, guide.title, 900).slice(0, 3)
  let cursor = 320
  for (const line of titleLines) {
    ctx.fillText(line, 84, cursor)
    cursor += 92
  }
  cursor += 24
  const items = guide.items.slice(0, 8)
  if (!items.length) {
    ctx.fillStyle = CREAM_DIM
    ctx.font = 'italic 48px "Instrument Serif", Georgia, serif'
    ctx.fillText('Nothing listed yet.', 84, cursor + 40)
  }
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    const rowY = cursor
    ctx.fillStyle = 'rgba(255, 250, 243, 0.08)'
    roundRect(ctx, 84, rowY, W - 168, 112, 18)
    ctx.fill()
    ctx.fillStyle = CORAL
    ctx.font = 'italic 48px "Instrument Serif", Georgia, serif'
    ctx.textAlign = 'left'
    ctx.fillText(String(index + 1), 112, rowY + 72)
    ctx.fillStyle = CREAM
    ctx.font = 'italic 44px "Instrument Serif", Georgia, serif'
    const name = wrap(ctx, item.name, 560)[0] ?? item.name
    ctx.fillText(name, 176, rowY + 52)
    ctx.fillStyle = CREAM_DIM
    ctx.font = '700 20px "Instrument Sans", sans-serif'
    ctx.fillText(item.neighborhood.toUpperCase(), 176, rowY + 86)
    if (typeof item.score === 'number') {
      ctx.fillStyle = CREAM
      ctx.font = 'italic 48px "Instrument Serif", Georgia, serif'
      ctx.textAlign = 'right'
      ctx.fillText(item.score.toFixed(1), item.metal ? W - 250 : W - 120, rowY + 72)
      ctx.textAlign = 'left'
    }
    if (item.metal) {
      await drawFork(ctx, item.metal, item.metal === 'gold', W - 210, rowY + 8, 72)
    }
    cursor += 128
  }
  if (guide.items.length > 8) {
    ctx.fillStyle = CREAM_DIM
    ctx.font = '700 24px "Instrument Sans", sans-serif'
    ctx.fillText(`and ${guide.items.length - 8} more`, 84, Math.min(cursor + 20, H - 150))
  }
  ctx.fillStyle = CORAL
  ctx.font = '700 32px "Instrument Sans", sans-serif'
  ctx.fillText('gustosguide.com', 84, H - 88)
  return blobOf(node)
}
