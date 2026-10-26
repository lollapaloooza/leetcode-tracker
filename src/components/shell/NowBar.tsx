import { PauseIcon, PlayIcon } from 'lucide-react'
import { LiveDot } from '@/components/timer/LiveDot'
import { NowProgress } from '@/components/today/NowClock'
import { useNowCard } from '@/components/today/useNowCard'
import { useNowClock } from '@/components/today/useNowClock'
import { Button } from '@/components/ui/button'
import type { Problem } from '@/data/problems'
import { cn } from '@/lib/_utils/cn'
import { formatDuration } from '@/lib/_utils/date'
import { useUI } from '@/lib/store'
import { useAwayTimer } from './useAwayTimer'

/** Phones: the problem on the clock, above the tab bar while you're on another tab. Tap it to go back. */
export function NowBar({ today }: { today: string }) {
  const away = useAwayTimer()
  return away ? <NowBarCard problem={away.problem} today={today} /> : null
}

function NowBarCard({ problem, today }: { problem: Problem; today: string }) {
  const now = useNowCard(problem, today)
  const { target, elapsed, over } = useNowClock(problem, now.timer)
  const setTab = useUI((s) => s.setTab)
  const running = now.state === 'running'
  const clock = formatDuration(elapsed)

  return (
    <section
      aria-label="On the clock"
      className="relative mx-2 mb-2 flex h-16 items-center gap-2.5 overflow-hidden rounded-xl bg-popover pr-2 pl-3.5 shadow-lg ring-1 ring-primary/40"
    >
      {now.timer && <NowProgress problem={problem} timer={now.timer} className="absolute inset-x-0 top-0" />}
      <LiveDot running={running} />
      <button
        type="button"
        className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`${problem.title}, ${clock} of ${target / 60_000} minutes. Go to Today`}
        onClick={() => setTab('today')}
      >
        <span className="block truncate text-sm font-semibold">{problem.title}</span>
        <span className="text-xs text-muted-foreground">
          <span className={cn('font-medium text-foreground tabular-nums', over && 'text-attempted-foreground')}>{clock}</span> of{' '}
          {formatDuration(target)}
        </span>
      </button>
      <Button variant="ghost" size="icon-lg" aria-label={running ? 'Pause timer' : 'Resume timer'} onClick={running ? now.pause : now.resume}>
        {running ? <PauseIcon /> : <PlayIcon />}
      </Button>
      <Button size="lg" aria-label="Log attempt" onClick={now.finish}>
        Log
      </Button>
    </section>
  )
}
