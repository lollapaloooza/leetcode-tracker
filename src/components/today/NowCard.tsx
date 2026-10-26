import { useId } from 'react'
import { DifficultyDot } from '@/components/DifficultyTag'
import { ProblemTitle } from '@/components/problem-bits'
import { LiveDot } from '@/components/timer/LiveDot'
import type { Problem } from '@/data/problems'
import { isSolved } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { NowActions } from './NowActions'
import { NowClock, NowProgress } from './NowClock'
import { useNowCard, type NowState } from './useNowCard'

interface NowCardProps {
  problem: Problem
  today: string
  /** Today's goal is already met, so this one is extra */
  bonus: boolean
}

/**
 * The one problem to work on now — being timed, or up next — with the clock and the next step.
 * Keyed by problem, so a new one rises in.
 */
export function NowCard({ problem, today, bonus }: NowCardProps) {
  const now = useNowCard(problem, today)
  const isReview = useTracker((s) => isSolved(s.progress[problem.id]?.status))
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="animate-rise overflow-hidden rounded-xl bg-card ring-1 ring-primary/55 max-sm:rounded-2xl">
      {/* Title on the left, the clock on the right; on phones the clock sits under the title. */}
      <div className="flex items-start justify-between gap-8 px-6 pt-5 pb-4.5 max-sm:flex-col max-sm:gap-1.5 max-sm:px-4 max-sm:pt-3.5 max-sm:pb-3">
        <div className="flex min-w-0 flex-col gap-2 max-sm:gap-1.5">
          <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground max-sm:text-xs">
            <StatusLabel state={now.state} />
            <span aria-hidden>·</span>
            {problem.topic}
            <span aria-hidden>·</span>
            {isReview ? 'Review' : 'New'}
            {bonus && <span className="rounded-full bg-muted px-2 text-xs font-medium">Bonus</span>}
          </p>
          <h2 id={titleId} className="min-w-0 text-[22px] leading-tight font-semibold tracking-tight max-sm:text-[19px]">
            <ProblemTitle problem={problem} className="max-w-full" />
          </h2>
          {/* Phones skip it: the time box under the title already says how big it is. */}
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground max-sm:hidden">
            <DifficultyDot difficulty={problem.difficulty} />
            {problem.difficulty}
          </span>
        </div>
        <NowClock problem={problem} timer={now.timer} />
      </div>
      <NowProgress problem={problem} timer={now.timer} className="max-sm:h-[3px]" />
      <NowActions problem={problem} now={now} />
    </section>
  )
}

function StatusLabel({ state }: { state: NowState }) {
  if (state === 'idle') return <span className="font-medium text-link">Up next</span>
  return (
    <span className="inline-flex items-center gap-1.5 font-medium text-link">
      <LiveDot running={state === 'running'} />
      {state === 'running' ? 'Working on it' : 'Paused'}
    </span>
  )
}
