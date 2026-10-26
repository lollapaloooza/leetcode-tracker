import type { CSSProperties, ReactNode, Ref } from 'react'
import { ArrowUpToLineIcon, CalendarDaysIcon, CheckIcon, PencilIcon, RotateCcwIcon, SunriseIcon, Undo2Icon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DifficultyTag } from '@/components/DifficultyTag'
import { ProblemLinks, ProblemTitle, ResultGlyph, ResultLabel, RowMenu, StatusGlyph, type RowAction } from '@/components/problem-bits'
import { LiveDot, TimerControls, TimerProgress } from '@/components/TimerControls'
import { addDays, formatRelative, saturdayAhead } from '@/lib/date'
import { RESULT_LABEL } from '@/lib/srs'
import { isSolved } from '@/lib/status'
import { useTracker } from '@/store'
import type { Attempt, PlanItem, Problem } from '@/types'
import { useUI } from '@/ui-store'
import { HandleSpacer } from './PlanBoard'

interface TodayRowProps {
  problem: Problem
  item: PlanItem
  today: string
  /** The first thing to do: the problem you're working on, or the one that's up next */
  lead?: boolean
  /** First among the problems you can reorder (so "Do first" has nothing to do) */
  first?: boolean
  /** Drag handle; rows that can't move get a spacer so the columns line up */
  handle?: ReactNode
  ref?: Ref<HTMLLIElement>
  style?: CSSProperties
  dragging?: boolean
}

export function TodayRow({ problem, item, today, lead, first, handle, ref, style, dragging }: TodayRowProps) {
  const status = useTracker((s) => s.progress[problem.id]?.status)
  const review = useTracker((s) => s.reviews[problem.id])
  const attempt = useTracker((s) => (item.attempt ? s.attempts.find((a) => a.key === item.attempt) : undefined))
  const timer = useTracker((s) => (s.timer?.id === problem.id ? s.timer : null))
  const anyTimer = useTracker((s) => s.timer !== null)
  const timing = timer !== null
  // Solved before today's attempt → this is a review, not a new problem.
  const isReview = attempt ? isSolved(attempt.prev.status) : isSolved(status)

  return (
    <li
      ref={ref}
      style={style}
      className={cn(
        'relative grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-x-3 gap-y-2 py-2.5 pr-4 pl-2 transition-colors hover:bg-muted/40 max-sm:gap-x-2 max-sm:pr-2 max-sm:pl-1',
        lead && 'py-3.5',
        // The problem you're working on right now stands out from the rest of the list.
        timing && 'bg-primary/6 shadow-[inset_3px_0_0_var(--primary)] hover:bg-primary/8',
        dragging && 'bg-muted/60 opacity-50',
      )}
    >
      {handle ?? <HandleSpacer />}
      <DoneControl problem={problem} item={item} attempt={attempt} today={today} />
      <div className="flex min-w-0 flex-col">
        <ProblemTitle
          problem={problem}
          className={cn(
            'text-sm transition-colors',
            lead && 'text-[15px] font-medium',
            item.done && 'text-muted-foreground line-through decoration-muted-foreground/40',
          )}
        />
        <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
          {item.done ? (
            attempt ? (
              <>
                <ResultLabel result={attempt.result} />
                {attempt.seconds !== null && <span>· {Math.max(1, Math.round(attempt.seconds / 60))} min</span>}
                <span>
                  · {review?.due ? `next review ${formatRelative(review.due, today)}` : 'mastered — no more reviews'}
                </span>
              </>
            ) : (
              <span>Marked solved</span>
            )
          ) : (
            <>
              {timing ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-link">
                  <LiveDot running={timer.startedAt !== null} />
                  {timer.startedAt !== null ? 'Working on it' : 'Paused'}
                </span>
              ) : (
                lead && <span className="font-medium text-link">Up next</span>
              )}
              {(timing || lead) && <span aria-hidden>·</span>}
              <span className="truncate max-sm:hidden">{problem.topic}</span>
              <span aria-hidden className="max-sm:hidden">
                ·
              </span>
              {isReview ? (
                <span className="inline-flex items-center gap-1 font-medium text-link">
                  <RotateCcwIcon className="size-3" /> Review
                </span>
              ) : (
                <span>New</span>
              )}
            </>
          )}
        </span>
      </div>
      {/* Right-aligned so difficulty and links line up across rows even while one row shows a timer.
          On phones they move to a second line under the title, and the menu keeps the top-right corner. */}
      <div className="flex items-center justify-end gap-2 max-sm:col-span-3 max-sm:col-start-3 max-sm:row-start-2 max-sm:flex-wrap max-sm:justify-start">
        {!item.done && <TimerControls problem={problem} today={today} prominent={lead && !anyTimer} />}
        <DifficultyTag difficulty={problem.difficulty} className="w-16 max-sm:w-auto" />
        <ProblemLinks problem={problem} />
      </div>
      <span className="max-sm:col-start-5 max-sm:row-start-1">
        <RowMenu title={problem.title} actions={todayActions(problem, item, today, { timing, first })} />
      </span>
      {timing && <TimerProgress problem={problem} />}
    </li>
  )
}

function todayActions(
  problem: Problem,
  item: PlanItem,
  today: string,
  { timing, first }: { timing: boolean; first?: boolean },
): RowAction[] {
  const s = () => useTracker.getState()
  const actions: RowAction[] = []
  if (!item.done && !timing) {
    if (!first) {
      actions.push({
        label: 'Do first',
        icon: <ArrowUpToLineIcon />,
        onSelect: () => {
          // Right after the problem you're working on, if there is one.
          const t = s().timer
          s().reorderPlan(today, t && t.id !== problem.id ? [t.id, problem.id] : [problem.id])
        },
      })
    }
    actions.push({ label: 'Move to tomorrow', icon: <SunriseIcon />, onSelect: () => s().moveToDay(problem.id, today, addDays(today, 1)) })
    const saturday = saturdayAhead(today)
    if (saturday) {
      actions.push({ label: 'Move to Saturday', icon: <CalendarDaysIcon />, onSelect: () => s().moveToDay(problem.id, today, saturday) })
    }
  }
  actions.push({
    label: timing ? 'Remove from today (stops the timer)' : 'Remove from today',
    icon: <XIcon />,
    onSelect: () => s().removeFromPlan(problem.id, today),
    separated: actions.length > 0,
  })
  return actions
}

function DoneControl({
  problem,
  item,
  attempt,
  today,
}: {
  problem: Problem
  item: PlanItem
  attempt: Attempt | undefined
  today: string
}) {
  const openLog = useUI((s) => s.openLog)
  const { undoAttempt, markUndone } = useTracker.getState()

  if (!item.done) {
    return (
      <button
        type="button"
        aria-label={`Log attempt for ${problem.title}`}
        title="Log attempt"
        onClick={() => openLog({ id: problem.id })}
        className="group/done grid size-6 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="grid size-5 place-items-center rounded-full border-2 border-border transition-colors group-hover/done:border-success">
          <CheckIcon className="size-3 text-success opacity-0 transition-opacity group-hover/done:opacity-70" strokeWidth={3.5} />
        </span>
      </button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${problem.title}: ${attempt ? RESULT_LABEL[attempt.result] : 'done'}. Edit or undo`}
          className="grid size-6 place-items-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {attempt ? <ResultGlyph result={attempt.result} /> : <StatusGlyph status="solved" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {attempt && (
          <DropdownMenuItem onSelect={() => openLog({ id: problem.id, editKey: attempt.key })}>
            <PencilIcon /> Edit attempt…
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => (attempt ? undoAttempt(attempt.key) : markUndone(problem.id, today))}
        >
          <Undo2Icon /> Undo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
