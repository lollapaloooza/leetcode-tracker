import { LiveDot } from '@/components/timer/LiveDot'
import { Button } from '@/components/ui/button'
import type { Problem } from '@/data/problems'
import { useNow } from '@/lib/_hooks/useNow'
import { formatDuration } from '@/lib/_utils/date'
import { timerElapsed } from '@/lib/domain'
import { useUI } from '@/lib/store'
import type { TimerState } from '@/types'
import { useAwayTimer } from './useAwayTimer'

/**
 * Keeps the clock in sight while you browse other tabs. Just the time — the header has no room for
 * a title beside the tabs; hover or the browser tab's title names the problem. Phones show the NowBar.
 */
export function TimerPill() {
  const away = useAwayTimer()
  // Mounted as you leave Today, so its clock starts from the current time.
  return away ? <Pill timer={away.timer} problem={away.problem} /> : null
}

function Pill({ timer, problem }: { timer: TimerState; problem: Problem }) {
  const setTab = useUI((s) => s.setTab)
  const running = timer.startedAt !== null
  const now = useNow(running)
  const elapsed = formatDuration(timerElapsed(timer, now))
  return (
    <Button
      variant="ghost"
      size="sm"
      className="bg-primary/10 text-link hover:bg-primary/15 hover:text-link max-sm:hidden"
      onClick={() => setTab('today')}
      title={problem.title}
      aria-label={`${running ? 'Working on' : 'Paused'} ${problem.title}, ${elapsed}. Go to Today`}
    >
      <LiveDot running={running} />
      <span className="tabular-nums">{elapsed}</span>
    </Button>
  )
}
