const PALETTES = [
  ['#141F4D', '#FF5330', '#EEE3D6', '#F2C14E'],
  ['#FF5330', '#141F4D', '#FFF6EA', '#38BA46'],
  ['#1E6B45', '#EEE3D6', '#FF5330', '#F2C14E'],
  ['#E7B23C', '#141F4D', '#FF5330', '#FFF6EA'],
  ['#24356E', '#F4D35E', '#EEE3D6', '#FF5330'],
  ['#7C2F39', '#EEE3D6', '#F2C14E', '#141F4D'],
  ['#10243F', '#38BA46', '#FFF6EA', '#FF5330'],
  ['#3D2B1F', '#F2C14E', '#EEE3D6', '#141F4D'],
]

type Motif = 'pizza' | 'coffee' | 'oyster' | 'bowl' | 'taco' | 'burger' | 'sushi' | 'glass' | 'scoop' | 'pastry' | 'sandwich' | 'dumpling' | 'plate'

function hashId(id: string): number {
  let hash = 2166136261
  for (const char of id) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function motifFor(cuisine: string, hash: number): Motif {
  const c = cuisine.toLowerCase()
  if (/pizza/.test(c)) return 'pizza'
  if (/coffee|espresso|cafe|café/.test(c)) return 'coffee'
  if (/oyster|seafood|fish|clam/.test(c)) return 'oyster'
  if (/taco|mexican/.test(c)) return 'taco'
  if (/burger/.test(c)) return 'burger'
  if (/sushi|japanese|omakase/.test(c)) return 'sushi'
  if (/cocktail|wine|bar|beer|pub/.test(c)) return 'glass'
  if (/ice|dessert|gelato/.test(c)) return 'scoop'
  if (/bakery|donut|pastry|doughnut/.test(c)) return 'pastry'
  if (/sandwich|deli/.test(c)) return 'sandwich'
  if (/dumpling|dim sum|gyoza/.test(c)) return 'dumpling'
  if (/ramen|noodle|pho|phở|soup/.test(c)) return 'bowl'
  const fallback: Motif[] = ['plate', 'bowl', 'glass', 'sandwich', 'pastry']
  return fallback[hash % fallback.length]
}

function Pattern({ kind, color }: { kind: number; color: string }) {
  if (kind % 4 === 0) {
    return (
      <g fill={color} opacity="0.35">
        {Array.from({ length: 18 }, (_, i) => (
          <circle key={i} cx={40 + (i % 6) * 130} cy={30 + Math.floor(i / 6) * 190} r={8 + (i % 3) * 4} />
        ))}
      </g>
    )
  }
  if (kind % 4 === 1) {
    return (
      <g stroke={color} strokeWidth="10" opacity="0.28">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={i * 110} y1="0" x2={i * 110 - 80} y2="600" />
        ))}
      </g>
    )
  }
  if (kind % 4 === 2) {
    return (
      <g fill="none" stroke={color} strokeWidth="8" opacity="0.3">
        <path d="M0 80 Q 100 20 200 80 T 400 80 T 600 80 T 800 80" />
        <path d="M0 220 Q 100 160 200 220 T 400 220 T 600 220 T 800 220" />
        <path d="M0 500 Q 100 440 200 500 T 400 500 T 600 500 T 800 500" />
      </g>
    )
  }
  return (
    <g fill={color} opacity="0.18">
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={(i % 4) * 200} y={Math.floor(i / 4) * 200} width="100" height="100" />
      ))}
    </g>
  )
}

function MotifShape({ motif, a, b, c, tilt }: { motif: Motif; a: string; b: string; c: string; tilt: number }) {
  const common = { stroke: '#181818', strokeWidth: 7 }
  if (motif === 'pizza') {
    return (
      <g transform={`rotate(${tilt} 400 320)`}>
        <circle cx="400" cy="320" r="150" fill={b} {...common} />
        <circle cx="400" cy="320" r="112" fill={a} />
        <path d="M400 208 L400 432 M288 320 L512 320" stroke={b} strokeWidth="8" />
      </g>
    )
  }
  if (motif === 'coffee') {
    return (
      <g transform={`rotate(${tilt} 400 330)`}>
        <rect x="250" y="230" width="250" height="170" rx="24" fill={b} {...common} />
        <path d="M500 270 h50 a50 50 0 0 1 0 100 h-50" fill="none" stroke="#181818" strokeWidth="7" />
        <ellipse cx="375" cy="230" rx="120" ry="22" fill={c} {...common} />
      </g>
    )
  }
  if (motif === 'oyster') {
    return (
      <g transform={`rotate(${tilt} 400 330)`}>
        <ellipse cx="400" cy="340" rx="180" ry="90" fill={b} {...common} />
        <ellipse cx="400" cy="330" rx="120" ry="48" fill={c} {...common} />
        <ellipse cx="400" cy="328" rx="28" ry="18" fill={a} />
      </g>
    )
  }
  if (motif === 'bowl') {
    return (
      <g transform={`rotate(${tilt} 400 340)`}>
        <path d="M220 280 H580 Q560 430 400 450 Q240 430 220 280 Z" fill={b} {...common} />
        <ellipse cx="400" cy="280" rx="180" ry="36" fill={a} {...common} />
        <path d="M300 300 Q400 360 500 300" fill="none" stroke={c} strokeWidth="10" />
      </g>
    )
  }
  if (motif === 'taco') {
    return (
      <g transform={`rotate(${tilt} 400 330)`}>
        <path d="M230 250 Q400 470 570 250" fill={c} {...common} />
        <path d="M270 250 Q400 390 530 250" fill={a} />
        <circle cx="340" cy="270" r="16" fill={b} />
        <circle cx="420" cy="255" r="14" fill={b} />
      </g>
    )
  }
  if (motif === 'burger') {
    return (
      <g transform={`rotate(${tilt} 400 320)`}>
        <path d="M250 250 Q400 160 550 250 V280 H250 Z" fill={c} {...common} />
        <rect x="245" y="290" width="310" height="28" rx="8" fill={a} {...common} />
        <rect x="245" y="328" width="310" height="36" fill={b} {...common} />
        <path d="M250 380 H550 Q400 450 250 380 Z" fill={c} {...common} />
      </g>
    )
  }
  if (motif === 'sushi') {
    return (
      <g transform={`rotate(${tilt} 400 320)`}>
        <rect x="220" y="250" width="360" height="140" rx="70" fill={b} {...common} />
        <rect x="250" y="285" width="300" height="70" rx="8" fill={a} />
        <rect x="300" y="300" width="200" height="40" rx="6" fill={c} />
      </g>
    )
  }
  if (motif === 'glass') {
    return (
      <g transform={`rotate(${tilt} 410 330)`}>
        <path d="M280 180 H500 L450 360 H330 Z" fill={a} {...common} />
        <rect x="370" y="360" width="40" height="70" fill={b} {...common} />
        <rect x="320" y="430" width="140" height="16" fill={c} {...common} />
      </g>
    )
  }
  if (motif === 'scoop') {
    return (
      <g transform={`rotate(${tilt} 400 300)`}>
        <circle cx="400" cy="250" r="90" fill={a} {...common} />
        <circle cx="330" cy="300" r="70" fill={c} {...common} />
        <path d="M340 360 L400 520 L460 360" fill={b} {...common} />
      </g>
    )
  }
  if (motif === 'pastry') {
    return (
      <g transform={`rotate(${tilt} 400 320)`}>
        <path d="M220 360 Q300 160 400 320 Q500 160 580 360 Q400 430 220 360 Z" fill={c} {...common} />
        <path d="M280 340 Q400 250 520 340" fill="none" stroke={a} strokeWidth="10" />
      </g>
    )
  }
  if (motif === 'sandwich') {
    return (
      <g transform={`rotate(${tilt} 400 320)`}>
        <path d="M210 250 H590 L540 310 H250 Z" fill={c} {...common} />
        <rect x="230" y="318" width="340" height="36" fill={a} {...common} />
        <path d="M220 370 H580 L530 430 H260 Z" fill={b} {...common} />
      </g>
    )
  }
  if (motif === 'dumpling') {
    return (
      <g transform={`rotate(${tilt} 400 330)`}>
        <path d="M230 340 Q400 180 570 340 Q400 430 230 340 Z" fill={b} {...common} />
        <path d="M400 210 V390" stroke={a} strokeWidth="6" />
        <path d="M320 250 Q400 300 480 250" fill="none" stroke="#181818" strokeWidth="5" />
      </g>
    )
  }
  return (
    <g transform={`rotate(${tilt} 400 330)`}>
      <ellipse cx="400" cy="360" rx="190" ry="36" fill={b} {...common} />
      <ellipse cx="400" cy="300" rx="150" ry="70" fill={a} {...common} />
      <circle cx="360" cy="290" r="16" fill={c} />
      <circle cx="430" cy="310" r="12" fill={c} />
    </g>
  )
}

export function PlaceArt({ id, cuisine, neighborhood }: { id: string; cuisine: string; neighborhood: string }) {
  const hash = hashId(id)
  const [bg, a, b, c] = PALETTES[hash % PALETTES.length]
  const tilt = (hash % 13) - 6
  const motif = motifFor(cuisine, hash)
  const tag = neighborhood.slice(0, 3).toUpperCase()
  return (
    <svg className="place-art" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Illustration of ${cuisine}`}>
      <rect width="800" height="600" fill={bg} />
      <Pattern kind={hash % 4} color={c} />
      <circle cx={120 + (hash % 90)} cy={90 + (hash % 40)} r="70" fill={a} opacity="0.85" />
      <MotifShape motif={motif} a={a} b={b} c={c} tilt={tilt} />
      <g transform={`rotate(${(hash % 7) - 8} 150 500)`}>
        <rect x="70" y="470" width="150" height="48" fill={b} stroke="#181818" strokeWidth="6" />
        <text x="145" y="502" textAnchor="middle" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif" fontSize="24" fontWeight="700" fill="#181818">
          {tag}
        </text>
      </g>
    </svg>
  )
}
