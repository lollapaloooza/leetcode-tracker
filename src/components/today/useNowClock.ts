import type { Problem } from '@/data/problems'
import { TARGET_MINUTES } from '@/lib/_consts/practice'
import { useNow } from '@/lib/_hooks/useNow'
import { timerElapsed } from '@/lib/domain'
import type { TimerState } from '@/types'

/** Time on the clock against the problem's time box, ticking every second while the timer runs. */
export function useNowClock(problem: Problem, timer: TimerState | null) {
  const now = useNow(Boolean(timer?.startedAt))
  const target = TARGET_MINUTES[problem.difficulty] * 60_000
  const elapsed = timer ? timerElapsed(timer, now) : 0
  return { target, elapsed, over: elapsed > target }
}
