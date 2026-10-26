import type { Problem } from '@/data/problems'
import { cn } from '@/lib/_utils/cn'
import { formatDuration } from '@/lib/_utils/date'
import type { TimerState } from '@/types'
import { useNowClock } from './useNowClock'

// The clock and the bar each tick on their own, so only they re-render every second.

/** The time on the clock against the problem's time box. */
export function NowClock({ problem, timer }: { problem: Problem; timer: TimerState | null }) {
  const { target, elapsed, over } = useNowClock(problem, timer)
  const left = Math.ceil((target - elapsed) / 60_000)
  const caption = !timer
    ? `${target / 60_000}-minute time box`
    : over
      ? `${Math.floor((elapsed - target) / 60_000)} min over ${formatDuration(target)}`
      : `of ${formatDuration(target)} · ${left} min left`

  return (
    // Right-aligned beside the title; under it on phones, where it wraps, left-aligned like the rest.
    <div className="flex flex-col items-end gap-1 max-sm:items-start">
      <span
        role="timer"
        aria-label={`${formatDuration(elapsed)} of ${target / 60_000} minutes`}
        className={cn(
          'text-4xl leading-none font-semibold tracking-tight tabular-nums',
          !timer && 'text-muted-foreground/50',
          over && 'text-attempted-foreground',
        )}
      >
        {formatDuration(elapsed)}
      </span>
      <span className="text-[13px] text-muted-foreground">{caption}</span>
    </div>
  )
}

/** A bar filling toward the time box, along a card's edge. */
export function NowProgress({ problem, timer, className }: { problem: Problem; timer: TimerState; className?: string }) {
  const { target, elapsed, over } = useNowClock(problem, timer)
  return (
    <span aria-hidden className={cn('block h-1 bg-primary/12', className)}>
      <span
        className={cn('block h-full transition-[width] duration-1000 ease-linear', over ? 'bg-attempted' : 'bg-primary')}
        style={{ width: `${Math.min(100, (elapsed / target) * 100)}%` }}
      />
    </span>
  )
}
