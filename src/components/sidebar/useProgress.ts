import { computePace } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { useSolvedStats } from './useSolvedStats'

/** Solved counts, and the interview pace once a date is set. */
export function useProgress(today: string) {
  const stats = useSolvedStats()
  const interview = useTracker((s) => s.interview)
  const pace = interview ? computePace(interview, stats.solved, stats.total, today) : null
  return {
    stats,
    percent: (stats.solved / stats.total) * 100,
    interview,
    pace,
    /** Where a steady pace would put you by today, as a % of the bar; null when there's nothing to mark */
    paceMarker: pace && pace.daysLeft > 0 && pace.expected > 0 ? (pace.expected / stats.total) * 100 : null,
  }
}
