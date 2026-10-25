import type { CSSProperties, ReactNode, Ref } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CalendarCheckIcon, SparklesIcon, SunriseIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { PROBLEMS, type Problem } from '@/data/problems'
import { addDays, formatDay } from '@/lib/date'
import { goalFor, isSolved, plannedFrom, suggestNext, useTracker, type PlanItem } from '@/store'
import { DifficultyDot } from './DifficultyTag'
import { problemIdOf, useSortableRow, useZone } from '@/lib/plan-board'
import { DragHandle, HandleSpacer } from './PlanBoard'
import { ProblemTitle, RowMenu, type RowAction } from './problem-bits'

const byId = new Map(PROBLEMS.map((p) => [p.id, p]))
const EMPTY: PlanItem[] = []

/** Choosing a problem is the hardest step after work — so do it the night before. */
export function TomorrowSection({ today, ids }: { today: string; ids: string[] }) {
  const tomorrow = addDays(today, 1)
  const planned = useTracker((s) => s.plans[tomorrow] ?? EMPTY)
  const goal = useTracker((s) => goalFor(s, tomorrow))
  const progress = useTracker((s) => s.progress)
  const studies = useTracker((s) => s.studies)
  const { ref: dropRef, isOver } = useZone('tomorrow', ids.length === 0)

  const pick = () => {
    const s = useTracker.getState()
    s.addToPlan(suggestNext(s, plannedFrom(s.plans, today), Math.max(goal - planned.length, 1), tomorrow), tomorrow)
  }

  return (
    <section aria-label="Tomorrow" className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold">
          Tomorrow <span className="font-normal text-muted-foreground">· {formatDay(tomorrow)}</span>
        </h2>
        <Button variant="ghost" size="xs" className="text-link" onClick={pick}>
          <SparklesIcon />
          {planned.length === 0 ? `Pick ${goal}` : 'Add 1 more'}
        </Button>
      </div>
      {ids.length === 0 ? (
        <p
          ref={dropRef}
          className={cn(
            'rounded-xl border border-dashed px-4 py-3 text-[13px] text-muted-foreground transition-colors',
            isOver && 'border-primary bg-primary/6 text-foreground',
          )}
        >
          Pick tomorrow's {goal === 1 ? 'problem' : 'problems'} tonight — or drag one here from today. After work you'll
          only need to press Start.
        </p>
      ) : (
        <ul ref={dropRef} aria-label="Tomorrow's problems" className="divide-y overflow-hidden rounded-xl bg-card/60 ring-1 ring-border">
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {ids.map((sid) => {
              const problem = byId.get(problemIdOf(sid))
              if (!problem) return null
              const studiedToday = studies.some((st) => st.id === problem.id && st.date === today)
              const tag = studiedToday ? 'Watched today — now solve it' : isSolved(progress[problem.id]?.status) ? 'Review' : 'New'
              return (
                <SortableUpcomingRow
                  key={sid}
                  sid={sid}
                  problem={problem}
                  meta={`${problem.topic} · ${tag}`}
                  highlight={studiedToday}
                  actions={[
                    {
                      label: 'Move to today',
                      icon: <CalendarCheckIcon />,
                      onSelect: () => useTracker.getState().moveToDay(problem.id, tomorrow, today),
                    },
                    {
                      label: 'Remove from tomorrow',
                      icon: <XIcon />,
                      onSelect: () => useTracker.getState().removeFromPlan(problem.id, tomorrow),
                      separated: true,
                    },
                  ]}
                />
              )
            })}
          </SortableContext>
        </ul>
      )}
    </section>
  )
}

/** Problems put off to a later day (like a Hard saved for Saturday), so they don't vanish from view. */
export function LaterSection({ today }: { today: string }) {
  const tomorrow = addDays(today, 1)
  const plans = useTracker((s) => s.plans)
  const later = Object.keys(plans)
    .filter((day) => day > tomorrow && plans[day].length > 0)
    .sort()
    .flatMap((day) => plans[day].map((item) => ({ day, problem: byId.get(item.id) })))
    .filter((x): x is { day: string; problem: Problem } => x.problem !== undefined)
  if (later.length === 0) return null

  const { moveToDay, removeFromPlan } = useTracker.getState()
  return (
    <section aria-label="Later" className="mt-3">
      <h2 className="mb-2 text-[13px] font-semibold">Later</h2>
      <ul className="divide-y overflow-hidden rounded-xl bg-card/60 ring-1 ring-border">
        {later.map(({ day, problem }) => (
          <UpcomingRow
            key={`${day}:${problem.id}`}
            problem={problem}
            meta={`${formatDay(day)} · ${problem.topic}`}
            actions={[
              { label: 'Move to today', icon: <CalendarCheckIcon />, onSelect: () => moveToDay(problem.id, day, today) },
              { label: 'Move to tomorrow', icon: <SunriseIcon />, onSelect: () => moveToDay(problem.id, day, tomorrow) },
              { label: `Remove from ${formatDay(day)}`, icon: <XIcon />, onSelect: () => removeFromPlan(problem.id, day), separated: true },
            ]}
          />
        ))}
      </ul>
    </section>
  )
}

interface UpcomingRowProps {
  problem: Problem
  meta: string
  highlight?: boolean
  actions: RowAction[]
  handle?: ReactNode
  ref?: Ref<HTMLLIElement>
  style?: CSSProperties
  dragging?: boolean
}

function UpcomingRow({ problem, meta, highlight, actions, handle, ref, style, dragging }: UpcomingRowProps) {
  return (
    <li
      ref={ref}
      style={style}
      className={cn(
        'grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 py-2 pr-4 pl-2 max-sm:gap-x-2 max-sm:pr-2 max-sm:pl-1',
        dragging && 'bg-muted/60 opacity-50',
      )}
    >
      {handle ?? <HandleSpacer />}
      {/* Same width as today's done circle, so titles line up across the lists. */}
      <span className="grid size-6 place-items-center">
        <DifficultyDot difficulty={problem.difficulty} />
      </span>
      <div className="flex min-w-0 flex-col">
        <ProblemTitle problem={problem} className="text-sm" />
        <span className={cn('truncate text-xs', highlight ? 'text-link' : 'text-muted-foreground')}>{meta}</span>
      </div>
      <RowMenu title={problem.title} actions={actions} />
    </li>
  )
}

function SortableUpcomingRow({ sid, ...row }: { sid: string } & UpcomingRowProps) {
  const { ref, style, dragging, handleProps } = useSortableRow(sid)
  return (
    <UpcomingRow
      {...row}
      ref={ref}
      style={style}
      dragging={dragging}
      handle={<DragHandle label={`Move ${row.problem.title}`} {...handleProps} />}
    />
  )
}
