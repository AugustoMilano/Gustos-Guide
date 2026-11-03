import { m, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cx } from '../lib/format.ts'

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <m.div
      className={cx(className)}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, delay }}
    >
      {children}
    </m.div>
  )
}
