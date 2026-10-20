import { areaTitle } from '../lib/city.ts'
import { useCityId } from '../lib/use-city.ts'

/** Persistent area name. The switcher is the control; this is the label on the page. */
export function AreaKicker({ className = '' }: { className?: string }) {
  return <p className={`area-kicker ${className}`.trim()}>{areaTitle(useCityId())}</p>
}
