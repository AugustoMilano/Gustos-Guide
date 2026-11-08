import { scoreBand } from './ScoreBadge.tsx'
import { formatHouseScore, HOUSE_SCORE_MAX, HOUSE_SCORE_MIN, stepHouseScore } from '../lib/house-score.ts'
import { useApp } from '../state/AppState.tsx'

function tick() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  navigator.vibrate?.(10)
}

export function HouseScorePad({ placeId, compact = false, onScored }: { placeId: string; compact?: boolean; onScored?: () => void }) {
  const app = useApp()
  if (!app.user?.isOwner) return null
  const current = app.gustoScore(placeId)
  const band = current == null ? null : scoreBand(current)
  const atMin = current != null && Math.round(current * 10) <= HOUSE_SCORE_MIN * 10
  const atMax = current != null && Math.round(current * 10) >= HOUSE_SCORE_MAX * 10

  function nudge(direction: -1 | 1) {
    const next = stepHouseScore(current, direction)
    if (next == null) return
    if (current != null && Math.round(current * 10) === Math.round(next * 10)) return
    tick()
    app.setHouseScore(placeId, next)
    onScored?.()
  }

  return (
    <div className={compact ? 'score-pad is-compact' : 'score-pad'}>
      {compact ? null : <p className="text-sm font-bold">House score</p>}
      <div className="score-dial">
        <button type="button" className="btn score-step" aria-label="Lower score by 0.1" disabled={current == null || atMin} onClick={() => nudge(-1)}>−</button>
        <p className="score-readout" aria-live="polite">
          <strong key={current == null ? 'empty' : formatHouseScore(current)}>{current == null ? '—' : formatHouseScore(current)}</strong>
          <span>{band ? band.label : 'Unscored'}</span>
        </p>
        <button type="button" className="btn score-step" aria-label={current == null ? 'Set score to 1.0' : 'Raise score by 0.1'} disabled={atMax} onClick={() => nudge(1)}>+</button>
      </div>
    </div>
  )
}
