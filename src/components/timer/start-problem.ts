import type { Problem } from '@/data/problems'
import { openInNewTab } from '@/lib/_utils/browser'
import { practiceLink } from '@/lib/domain'
import { useTracker } from '@/lib/store'

/**
 * Start: the timer starts and the problem opens in a new tab, so one click gets you solving. Call it
 * from a click or a menu choice, so browsers treat the tab as wanted rather than as a popup.
 */
export function startProblem(problem: Problem, today: string) {
  useTracker.getState().startTimer(problem.id, today)
  openInNewTab(practiceLink(problem).url)
}
