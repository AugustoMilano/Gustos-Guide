const PALETTES = [
  ['#141F4D', '#FF5330', '#EEE3D6', '#F2C14E'],
  ['#FF5330', '#141F4D', '#FFF6EA', '#38BA46'],
  ['#1E6B45', '#EEE3D6', '#FF5330', '#F2C14E'],
  ['#E7B23C', '#141F4D', '#FF5330', '#FFF6EA'],
  ['#24356E', '#F4D35E', '#EEE3D6', '#FF5330'],
  ['#7C2F39', '#EEE3D6', '#F2C14E', '#141F4D'],
]

function hashId(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  return hash
}

export function PlaceArt({ id, cuisine, neighborhood }: { id: string; cuisine: string; neighborhood: string }) {
  const hash = hashId(id)
  const [bg, a, b, c] = PALETTES[hash % PALETTES.length]
  const pizza = cuisine.toLowerCase() === 'pizza'
  const tilt = (hash % 11) - 5
  const tag = neighborhood.slice(0, 3).toUpperCase()
  return (
    <svg className="place-art" viewBox="0 0 800 600" role="img" aria-label={`Illustration of ${cuisine}`}>
      <rect width="800" height="600" fill={bg} />
      <circle cx={160 + (hash % 80)} cy="120" r="150" fill={a} />
      <circle cx="640" cy="470" r="180" fill={c} />
      {pizza ? (
        <g transform={`rotate(${tilt} 400 310)`}>
          <circle cx="400" cy="320" r="168" fill={b} stroke="#181818" strokeWidth="8" />
          <circle cx="400" cy="320" r="132" fill={a} />
          <path d="M400 188 L400 452 M268 320 L532 320" stroke={b} strokeWidth="8" />
        </g>
      ) : (
        <g transform={`rotate(${tilt} 400 320)`}>
          <rect x="210" y="210" width="380" height="46" rx="18" fill={b} stroke="#181818" strokeWidth="6" />
          <rect x="190" y="268" width="420" height="70" rx="8" fill={a} stroke="#181818" strokeWidth="6" />
          <rect x="220" y="350" width="360" height="42" rx="16" fill={c} stroke="#181818" strokeWidth="6" />
        </g>
      )}
      <g transform="rotate(-8 150 470)">
        <rect x="70" y="440" width="150" height="54" fill={b} stroke="#181818" strokeWidth="6" />
        <text x="145" y="476" textAnchor="middle" fontFamily="Instrument Sans, sans-serif" fontSize="26" fontWeight="700" fill="#181818">
          {tag}
        </text>
      </g>
    </svg>
  )
}
