export function scoreBand(score: number): { label: string; tone: 'best' | 'great' | 'good' | 'fine' | 'skip' } {
  if (score >= 9) return { label: 'Best of the best', tone: 'best' }
  if (score >= 8) return { label: 'Great', tone: 'great' }
  if (score >= 7) return { label: 'Good', tone: 'good' }
  if (score >= 6) return { label: "It's fine", tone: 'fine' }
  return { label: 'Skip', tone: 'skip' }
}

export function ScoreBadge({ score, size = 'md' }: { score: number | null; size?: 'md' | 'sm' }) {
  if (score == null && size === 'sm') {
    return (
      <p className="score-badge score-badge-sm is-muted" aria-label="Gusto's Score, not yet rated">
        <small>Gusto's</small>
        <strong>—</strong>
        <span>Not yet rated</span>
      </p>
    )
  }
  if (score == null) {
    return (
      <p className="score-badge is-muted">
        <small>Gusto's</small>
        <strong>Not yet rated</strong>
      </p>
    )
  }
  const band = scoreBand(score)
  return (
    <p className={`score-badge tone-${band.tone} ${size === 'sm' ? 'score-badge-sm' : ''}`} aria-label={`Gusto's Score ${score.toFixed(1)}, ${band.label}`}>
      <small>Gusto's</small>
      <strong>{score.toFixed(1)}</strong>
      <span>{band.label}</span>
    </p>
  )
}
