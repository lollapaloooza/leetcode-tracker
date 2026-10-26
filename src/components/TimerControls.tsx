import { PauseIcon, PlayIcon, SquareIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Problem } from '@/data/problems'
import { TARGET_MINUTES } from '@/lib/_consts/practice'
import { useNow } from '@/lib/_hooks/use-now'
import { cn } from '@/lib/_utils/cn'
import { formatDuration } from '@/lib/_utils/date'
import { timerElapsed } from '@/lib/domain'
import { useTracker, useUI } from '@/lib/store'

/**
 * Start button, or the live clock for the problem being timed. One timer at a time.
 * `prominent` makes Start the main action — for the problem that's up next.
 */
export function TimerControls({ problem, today, prominent }: { problem: Problem; today: string; prominent?: boolean }) {
  const timer = useTracker((s) => s.timer)
  const { startTimer, pauseTimer, resumeTimer, cancelTimer } = useTracker.getState()
  const openLog = useUI((s) => s.openLog)
  const mine = timer?.id === problem.id
  const running = mine && timer.startedAt !== null
  const now = useNow(running)
  const target = TARGET_MINUTES[problem.difficulty]

  if (!timer) {
    return (
      <Button
        variant={prominent ? 'default' : 'ghost'}
        size={prominent ? 'sm' : 'xs'}
        className={prominent ? undefined : 'text-muted-foreground'}
        title={`Start a ${target}-minute timer`}
        aria-label={`Start timer for ${problem.title}`}
        onClick={() => startTimer(problem.id, today)}
      >
        <PlayIcon />
        Start
      </Button>
    )
  }
  if (!mine) return null

  const ms = timerElapsed(timer, now)
  const over = ms > target * 60_000

  return (
    <span className="flex h-7 items-center gap-0.5 rounded-full bg-primary/10 pr-0.5 pl-2.5">
      <span
        className={cn('text-xs font-semibold tabular-nums', over ? 'text-attempted-foreground' : 'text-link')}
        role="timer"
        aria-label={`${formatDuration(ms)} elapsed of ${target} minutes`}
      >
        {formatDuration(ms)}
      </span>
      <span className="mr-1 text-[11px] text-muted-foreground">/{target}m</span>
      <Button
        variant="ghost"
        size="icon-xs"
        className="rounded-full"
        aria-label={running ? 'Pause timer' : 'Resume timer'}
        onClick={running ? pauseTimer : resumeTimer}
      >
        {running ? <PauseIcon className="fill-current" /> : <PlayIcon className="fill-current" />}
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="rounded-full"
        aria-label="Stop and log attempt"
        title="Stop and log"
        onClick={() => {
          pauseTimer()
          openLog({ id: problem.id })
        }}
      >
        <SquareIcon className="fill-current" />
      </Button>
      {!running && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="rounded-full text-muted-foreground"
          aria-label="Discard timer"
          title="Discard timer"
          onClick={cancelTimer}
        >
          <XIcon />
        </Button>
      )}
    </span>
  )
}

/** Elapsed time against the target, as a thin bar along the bottom of the row being worked on. */
export function TimerProgress({ problem }: { problem: Problem }) {
  const timer = useTracker((s) => (s.timer?.id === problem.id ? s.timer : null))
  const now = useNow(Boolean(timer?.startedAt))
  if (!timer) return null
  const target = TARGET_MINUTES[problem.difficulty] * 60_000
  const ms = timerElapsed(timer, now)
  return (
    <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-primary/12">
      <span
        className={cn('block h-full transition-[width] duration-1000 ease-linear', ms > target ? 'bg-attempted' : 'bg-primary')}
        style={{ width: `${Math.min(100, (ms / target) * 100)}%` }}
      />
    </span>
  )
}

/** A small "live" dot that pulses while the timer runs and rests while it's paused. */
export function LiveDot({ running, className }: { running: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn('relative inline-flex size-2 shrink-0', className)}>
      {running && <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-50 motion-reduce:hidden" />}
      <span className={cn('relative size-2 rounded-full', running ? 'bg-primary' : 'bg-muted-foreground/60')} />
    </span>
  )
}
