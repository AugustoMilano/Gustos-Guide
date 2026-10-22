export const LIST_EMOJI = ['🍜', '🍕', '🍣', '🍷', '🌮', '🍔', '🍰', '☕'] as const

export const LIST_COLORS = [
  { id: 'coral', label: 'Coral', value: '#ff5330' },
  { id: 'navy', label: 'Navy', value: '#141f4d' },
  { id: 'leaf', label: 'Leaf', value: '#1e8f32' },
  { id: 'gold', label: 'Gold', value: '#e7b23c' },
  { id: 'ink', label: 'Ink', value: '#181818' },
] as const

export function listColor(id: string | undefined): string {
  return LIST_COLORS.find((color) => color.id === id)?.value ?? '#ff5330'
}

export function listOgSvg(title: string, detail: string, emoji: string, color: string): string {
  const safeTitle = title.replace(/[<>&]/g, '').slice(0, 42)
  const safeDetail = detail.replace(/[<>&]/g, '').slice(0, 48)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#141f4d"/>
    <rect x="72" y="72" width="1056" height="486" rx="36" fill="#fffaf3"/>
    <rect x="72" y="72" width="28" height="486" fill="${color}"/>
    <text x="140" y="220" font-family="Georgia, serif" font-size="92" fill="#181818">${emoji || '🍽'}</text>
    <text x="140" y="360" font-family="Georgia, serif" font-size="72" font-style="italic" fill="#181818">${safeTitle}</text>
    <text x="140" y="440" font-family="Georgia, serif" font-size="36" fill="#181818">${safeDetail}</text>
    <text x="140" y="510" font-family="Georgia, serif" font-size="28" fill="#141f4d">Gusto's Guide</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
