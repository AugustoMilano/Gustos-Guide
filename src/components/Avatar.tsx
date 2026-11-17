/** A person's photo, or their initials on a color picked from their name when there is no photo. */
const TONES = ['#e8604c', '#2f6f8f', '#7a5c99', '#3f8f5f', '#c27c1a', '#b0476a', '#4a6fd1', '#5b7f2a']

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const first = [...words[0]][0] ?? ''
  const last = words.length > 1 ? [...words[words.length - 1]][0] ?? '' : ''
  return (first + last).toUpperCase()
}

function toneOf(seed: string): string {
  let hash = 0
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return TONES[hash % TONES.length]
}

export function Avatar({ name, url, size = 40, className = '' }: { name: string; url?: string | null; size?: number; className?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`avatar shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`avatar avatar-initials inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, background: toneOf(name || '?'), fontSize: Math.max(11, Math.round(size * 0.4)) }}
    >
      {initialsOf(name)}
    </span>
  )
}
