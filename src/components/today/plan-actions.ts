// What the Today buttons do beyond a single store call: each change says what happened in a toast
// with Undo, and whatever lands somewhere new glows for a moment. They read the store when clicked,
// so they never act on stale state.
import type { Problem } from '@/data/problems'
import { formatDuration } from '@/lib/_utils/date'
import { timerElapsed } from '@/lib/domain'
import { useTracker, useUI } from '@/lib/store'

const tracker = () => useTracker.getState()
const ui = () => useUI.getState()

/** Take a problem off a day's plan and into the backlog. Undo puts it back where it was. */
export function removeFromDay(problem: Problem, day: string, { emptiesFocus = false } = {}) {
  const index = tracker().plans[day]?.findIndex((p) => p.id === problem.id) ?? -1
  if (index < 0) return
  tracker().removeFromPlan(problem.id, day)
  // Taken out of the Now card: leave it empty, so the next problem doesn't jump in.
  if (emptiesFocus) ui().clearFocus(day)
  ui().highlight(problem.id)
  ui().showToast({
    text: `${problem.title} moved to the backlog`,
    action: {
      label: 'Undo',
      run: () => {
        tracker().putBack(problem.id, day, index)
        if (emptiesFocus) ui().restoreFocus()
        else ui().highlight(problem.id)
      },
    },
  })
}

/** Stop the clock and keep the problem in the queue; the Now card empties. Undo restarts it where it was. */
export function stopTimer(today: string) {
  const timer = tracker().timer
  if (!timer) return
  const elapsed = timerElapsed(timer, Date.now())
  tracker().cancelTimer()
  ui().clearFocus(today)
  ui().showToast({
    text: `Timer stopped at ${formatDuration(elapsed)}`,
    action: {
      label: 'Undo',
      run: () => {
        tracker().restoreTimer({ id: timer.id, elapsed, startedAt: timer.startedAt === null ? null : Date.now() })
        ui().restoreFocus()
      },
    },
  })
}

/** Plan a problem from the backlog for today, at the end of the queue. */
export function planFromBacklog(problem: Problem, today: string) {
  tracker().addToPlan([problem.id], today)
  ui().highlight(problem.id)
}

/** Let go of a backlog problem. Undo keeps it, in the same place. */
export function forget(problem: Problem) {
  const index = tracker().backlog.indexOf(problem.id)
  if (index < 0) return
  tracker().removeFromBacklog(problem.id)
  ui().showToast({
    text: `${problem.title} removed from the backlog`,
    action: {
      label: 'Undo',
      run: () => {
        tracker().addToBacklog(problem.id, index)
        ui().highlight(problem.id)
      },
    },
  })
}
