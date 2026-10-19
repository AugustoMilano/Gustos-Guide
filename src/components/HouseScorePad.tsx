import { scoreBand } from './ScoreBadge.tsx'
import { useApp } from '../state/AppState.tsx'

const WHOLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const TENTHS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function parts(score: number | null): { whole: number | null; tenth: number | null } {
  if (score == null) return { whole: null, tenth: null }
  const tenths = Math.round(score * 10)
  return { whole: Math.floor(tenths / 10), tenth: tenths % 10 }
}

function tick() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  navigator.vibrate?.(10)
}

export function HouseScorePad({ placeId, compact = false, onScored }: { placeId: string; compact?: boolean; onScored?: () => void }) {
  const app = useApp()
  if (!app.user?.isOwner) return null
  const current = app.gustoScore(placeId)
  const { whole, tenth } = parts(current)
  const band = current == null ? null : scoreBand(current)

  function commit(next: number) {
    const value = Math.round(next * 10) / 10
    if (value < 1 || value > 10) return
    if (current != null && Math.round(current * 10) === Math.round(value * 10)) return
    tick()
    app.setHouseScore(placeId, value)
    onScored?.()
  }

  function pickWhole(n: number) {
    if (n === 10) {
      commit(10)
      return
    }
    const keep = whole === n && tenth != null ? tenth : 0
    commit(n + keep / 10)
  }

  function pickTenth(step: number) {
    if (whole == null || whole >= 10) return
    commit(whole + step / 10)
  }

  function nudge(step: number) {
    if (current == null) return
    commit(current + step)
  }

  return (
    <div className={compact ? 'score-pad is-compact' : 'score-pad'}>
      {compact ? null : <p className="text-sm font-bold">House score</p>}
      <div className="score-dial">
        <button type="button" className="btn score-step" aria-label="Lower by 0.1" disabled={current == null || current <= 1} onClick={() => nudge(-0.1)}>−</button>
        <p className="score-readout" aria-live="polite">
          <strong key={current == null ? 'empty' : current.toFixed(1)}>{current == null ? '—' : current.toFixed(1)}</strong>
          <span>{band ? band.label : 'Tap a number'}</span>
        </p>
        <button type="button" className="btn score-step" aria-label="Raise by 0.1" disabled={current == null || current >= 10} onClick={() => nudge(0.1)}>+</button>
      </div>
      <div className="chip-row mt-2" role="group" aria-label="Whole number">
        {WHOLES.map((n) => (
          <button key={n} type="button" className="chip" aria-pressed={whole === n} onClick={() => pickWhole(n)}>{n}</button>
        ))}
      </div>
      <div className="chip-row mt-1" role="group" aria-label="Tenths">
        {TENTHS.map((step) => (
          <button
            key={step}
            type="button"
            className="chip"
            aria-pressed={(tenth === step && whole != null && whole < 10) || (whole === 10 && step === 0)}
            disabled={whole == null || (whole === 10 && step !== 0)}
            onClick={() => pickTenth(step)}
          >
            .{step}
          </button>
        ))}
      </div>
    </div>
  )
}
