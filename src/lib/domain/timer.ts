import type { TimerState } from '@/types'

/** Time on the clock at `at` (epoch ms): what was banked before the current stretch, plus the stretch. */
export const timerElapsed = (t: TimerState, at: number) =>
  t.elapsed + (t.startedAt === null ? 0 : Math.max(0, at - t.startedAt))
