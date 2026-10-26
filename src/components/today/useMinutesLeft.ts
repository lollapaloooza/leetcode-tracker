import { useNow } from '@/lib/_hooks/useNow'
import { minutesLeft, type DayOrder } from '@/lib/domain'
import { useTracker } from '@/lib/store'

/** Minutes of time box left before today's goal, counting down while the timer runs. */
export function useMinutesLeft(order: DayOrder) {
  const timer = useTracker((s) => s.timer)
  const now = useNow(Boolean(timer?.startedAt))
  return minutesLeft(order, timer, now)
}
