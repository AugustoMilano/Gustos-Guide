import { useApp } from '../state/AppState.tsx'

export function HouseScorePad({ placeId, compact = false }: { placeId: string; compact?: boolean }) {
  const app = useApp()
  if (!app.user?.isOwner) return null
  const current = app.gustoScore(placeId)
  return (
    <div className="score-pad">
      {compact ? null : <p className="text-sm font-bold">House score</p>}
      <div className="chip-row mt-2" role="group" aria-label="House score from 1 to 10">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((score) => (
          <button
            key={score}
            type="button"
            className="chip"
            aria-pressed={current != null && Math.round(current) === score}
            onClick={() => app.setHouseScore(placeId, score)}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  )
}
