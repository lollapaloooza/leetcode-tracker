import { useEffect } from 'react'
import { problemById } from '@/data/problems'
import { useNow } from '@/lib/_hooks/useNow'
import { formatDuration } from '@/lib/_utils/date'
import { timerElapsed } from '@/lib/domain'
import { useTracker } from '@/lib/store'

const BASE_TITLE = 'LeetCode Tracker'

/**
 * The browser tab shows what you're working on — handy while you're over on LeetCode. A component of
 * its own, so the per-second tick re-renders only this.
 */
export function DocumentTitle() {
  const timer = useTracker((s) => s.timer)
  const running = Boolean(timer?.startedAt)
  const now = useNow(running)
  const problem = timer ? problemById.get(timer.id) : undefined
  const title =
    timer && problem
      ? `${running ? `▶ ${formatDuration(timerElapsed(timer, now))}` : '⏸ Paused'} · ${problem.title} — ${BASE_TITLE}`
      : BASE_TITLE

  useEffect(() => {
    document.title = title
  }, [title])
  return null
}
