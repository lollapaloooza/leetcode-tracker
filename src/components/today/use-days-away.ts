import { useMemo } from 'react'
import { diffDays } from '@/lib/date'
import { activityByDay, lastActiveBefore } from '@/lib/insights'
import { useTracker } from '@/store'

/** Days without practice before "welcome back" replaces the usual nudges. */
const AWAY_DAYS = 3

/** Days since you last practiced, when it's been long enough for a welcome back — else null. */
export function useDaysAway(today: string): number | null {
  const attempts = useTracker((s) => s.attempts)
  const plans = useTracker((s) => s.plans)
  const studies = useTracker((s) => s.studies)
  const comebackAt = useTracker((s) => s.comebackAt)
  const active = useMemo(() => activityByDay(attempts, plans, studies), [attempts, plans, studies])

  const last = lastActiveBefore(active.keys(), today)
  if (!last || active.has(today)) return null
  const away = diffDays(last, today)
  const handledRecently = comebackAt !== null && comebackAt > last && diffDays(comebackAt, today) < AWAY_DAYS
  return away >= AWAY_DAYS && !handledRecently ? away : null
}
