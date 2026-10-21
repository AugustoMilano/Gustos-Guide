import { useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { forkSvg, type ForkMetal } from '../lib/fork-mark.ts'
import { awardFor } from '../lib/top25.ts'
import { useApp } from '../state/AppState.tsx'

const REGION_LABEL = { seattle: 'Seattle', la: 'Los Angeles' } as const

export function ForkMark({
  metal,
  rank,
  size = 'sm',
  gem = false,
  caption,
  label,
  overlay = false,
}: {
  metal: ForkMetal
  rank?: number
  size?: 'sm' | 'md' | 'lg'
  gem?: boolean
  caption?: string
  label: string
  overlay?: boolean
}) {
  const rawId = useId()
  const id = `fork${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const reduce = useReducedMotion()
  const text = caption ?? (metal === 'navy' ? 'Top 25' : rank ? `#${rank}` : '')
  return (
    <motion.span
      className={`fork-badge fork-${size}${metal === 'navy' ? ' fork-navy' : ''}${overlay ? ' fork-on-photo' : ''}`}
      role="img"
      aria-label={label}
      initial={reduce ? false : { opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }}
    >
      <span className="fork-svg" dangerouslySetInnerHTML={{ __html: forkSvg(metal, { id, gem }) }} />
      {text ? <span className="fork-caption">{text}</span> : null}
    </motion.span>
  )
}

export function GoldenFork({
  placeId,
  size = 'sm',
  overlay = false,
}: {
  placeId: string
  size?: 'sm' | 'md' | 'lg'
  overlay?: boolean
}) {
  const { gustoScore } = useApp()
  const award = awardFor(placeId, gustoScore)
  if (!award) return null
  const where = REGION_LABEL[award.region]
  const label = award.metal === 'navy'
    ? `Top 25, number ${award.rank} in ${where}`
    : `Golden Fork number ${award.rank} in ${where}`
  return (
    <ForkMark
      metal={award.metal}
      rank={award.rank}
      size={size}
      gem={award.rank === 1}
      label={label}
      overlay={overlay}
    />
  )
}
