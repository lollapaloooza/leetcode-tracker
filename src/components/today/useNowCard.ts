import { requestStart } from '@/components/timer/start-problem'
import { videoUrl, type Problem } from '@/data/problems'
import { practiceLink, SITE_NAME, siteUrl } from '@/lib/domain'
import { useTracker, useUI } from '@/lib/store'
import { removeFromDay, stopTimer } from './plan-actions'

export type NowState = 'idle' | 'running' | 'paused'

/** The problem in the spotlight: its timer state, and what you can do next. */
export function useNowCard(problem: Problem, today: string) {
  const timer = useTracker((s) => (s.timer?.id === problem.id ? s.timer : null))
  const pause = useTracker((s) => s.pauseTimer)
  const resume = useTracker((s) => s.resumeTimer)
  const openLog = useUI((s) => s.openLog)
  const openedOn = useUI((s) => (s.openedOn?.id === problem.id ? s.openedOn.site : null))
  const state: NowState = timer === null ? 'idle' : timer.startedAt === null ? 'paused' : 'running'

  return {
    state,
    timer,
    // Back to the site you opened it on; LeetCode (or NeetCode for Premium) when you only started the timer.
    link: openedOn ? { site: SITE_NAME[openedOn], url: siteUrl(problem, openedOn) } : practiceLink(problem),
    video: videoUrl(problem),
    start: () => requestStart(problem, today),
    pause,
    resume,
    // Stop the clock first, so the time in the log form holds still.
    finish: () => {
      pause()
      openLog({ id: problem.id })
    },
    stop: () => stopTimer(today),
    remove: () => removeFromDay(problem, today, { emptiesFocus: true }),
  }
}

export type NowCardModel = ReturnType<typeof useNowCard>
