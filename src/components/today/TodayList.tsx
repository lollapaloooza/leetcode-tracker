import { Fragment } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { BatteryMediumIcon } from 'lucide-react'
import { problemById } from '@/data/problems'
import { cn } from '@/lib/_utils/cn'
import type { PlanItem } from '@/types'
import { problemIdOf, useSortableRow, useZone } from './plan-board'
import { DragHandle } from './PlanBoard'
import { TodayRow } from './TodayRow'

/**
 * What's left, in the order you'll do it: the problem you're on (or up next) leads, a line marks
 * where today's goal ends, and finished problems sink to the bottom.
 */
export function TodayList({
  today,
  plan,
  current,
  ids,
  goal,
}: {
  today: string
  plan: PlanItem[]
  current: number | null
  ids: string[]
  goal: number
}) {
  const { ref: dropRef, isOver } = useZone('today', ids.length === 0)
  const done = plan.filter((p) => p.done)
  const itemFor = (id: number) => plan.find((p) => p.id === id) ?? { id, done: false }
  const offset = current !== null ? 1 : 0
  // Unfinished problems still needed for the goal; the rest are a bonus.
  const needed = Math.max(0, goal - done.length)
  const bonusFrom = needed < ids.length + offset ? needed : null
  const leadId = current ?? (needed > 0 && ids.length > 0 ? problemIdOf(ids[0]) : null)
  const currentProblem = current !== null ? problemById.get(current) : undefined

  return (
    <ul
      ref={dropRef}
      aria-label="Today's problems"
      className={cn(
        'divide-y overflow-hidden rounded-xl bg-card ring-1 ring-border transition-shadow',
        isOver && 'ring-2 ring-primary/50',
      )}
    >
      {bonusFrom === 0 && <BonusLine />}
      {currentProblem && <TodayRow problem={currentProblem} item={itemFor(currentProblem.id)} today={today} lead />}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((sid, i) => {
          const problem = problemById.get(problemIdOf(sid))
          if (!problem) return null
          return (
            <Fragment key={sid}>
              {bonusFrom !== null && bonusFrom > 0 && i + offset === bonusFrom && <BonusLine />}
              <SortableTodayRow
                sid={sid}
                problem={problem}
                item={itemFor(problem.id)}
                today={today}
                lead={leadId === problem.id && current === null}
                first={i === 0}
              />
            </Fragment>
          )
        })}
      </SortableContext>
      {ids.length === 0 && current === null && done.length === 0 && (
        <li className="px-4 py-3 text-center text-[13px] text-muted-foreground">Drop it here to keep it for today</li>
      )}
      {done.map((item) => {
        const problem = problemById.get(item.id)
        return problem ? <TodayRow key={item.id} problem={problem} item={item} today={today} /> : null
      })}
    </ul>
  )
}

function SortableTodayRow({ sid, ...row }: { sid: string } & Parameters<typeof TodayRow>[0]) {
  const { ref, style, dragging, handleProps } = useSortableRow(sid)
  return (
    <TodayRow
      {...row}
      ref={ref}
      style={style}
      dragging={dragging}
      handle={<DragHandle label={`Move ${row.problem.title}`} {...handleProps} />}
    />
  )
}

/** Where today's goal ends — anything below is extra, for evenings with energy to spare. */
function BonusLine() {
  return (
    <li className="flex items-center gap-2 bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
      <BatteryMediumIcon className="size-3.5" />
      <span>
        <span className="font-medium text-foreground">Bonus</span> — only if you still have energy
      </span>
    </li>
  )
}
