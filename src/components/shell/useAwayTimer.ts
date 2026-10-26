import { problemById } from '@/data/problems'
import { useTracker, useUI } from '@/lib/store'

/** The problem on the clock, while you're on another tab — Today's Now card already shows it. */
export function useAwayTimer() {
  const timer = useTracker((s) => s.timer)
  const onToday = useUI((s) => s.tab === 'today')
  const problem = timer ? problemById.get(timer.id) : undefined
  return timer && problem && !onToday ? { timer, problem } : null
}
