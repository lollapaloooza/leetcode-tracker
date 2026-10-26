import { startProblem } from '@/components/timer/start-problem'
import type { Problem } from '@/data/problems'
import { practiceLink } from '@/lib/domain'
import { useTracker, useUI } from '@/lib/store'

export type NowState = 'idle' | 'running' | 'paused'

/** The problem in the spotlight: its timer state, and what you can do next. */
export function useNowCard(problem: Problem, today: string) {
  const timer = useTracker((s) => (s.timer?.id === problem.id ? s.timer : null))
  const pause = useTracker((s) => s.pauseTimer)
  const resume = useTracker((s) => s.resumeTimer)
  const openLog = useUI((s) => s.openLog)
  const state: NowState = timer === null ? 'idle' : timer.startedAt === null ? 'paused' : 'running'

  return {
    state,
    timer,
    link: practiceLink(problem),
    start: () => startProblem(problem, today),
    pause,
    resume,
    // Stop the clock first, so the time in the log form holds still.
    finish: () => {
      pause()
      openLog({ id: problem.id })
    },
  }
}

export type NowCardModel = ReturnType<typeof useNowCard>
