import { Fragment } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { BatteryMediumIcon } from 'lucide-react'
import { problemById } from '@/data/problems'
import { cn } from '@/lib/_utils/cn'
import type { DayOrder } from '@/lib/domain'
import type { PlanItem } from '@/types'
import { problemIdOf } from './board-lists'
import { QueueRow } from './QueueRow'
import { useZone } from './useZone'

interface QueueListProps {
  today: string
  plan: PlanItem[]
  order: DayOrder
  /** Sortable ids of the queue, in the order shown (a draft while dragging) */
  ids: string[]
}

/** What's left after the problem in the spotlight, with a line where today's goal ends. */
export function QueueList({ today, plan, order, ids }: QueueListProps) {
  const { ref: dropRef, isOver } = useZone('today', ids.length === 0)
  const itemFor = (id: number) => plan.find((p) => p.id === id) ?? { id, done: false }

  return (
    <ul
      ref={dropRef}
      aria-label="Today's queue"
      className={cn('divide-y overflow-hidden rounded-xl bg-card ring-1 ring-border transition-shadow', isOver && 'ring-2 ring-primary/50')}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ids.map((sid, i) => {
          const problem = problemById.get(problemIdOf(sid))
          if (!problem) return null
          return (
            <Fragment key={sid}>
              {order.bonusFrom === i && <BonusLine />}
              <QueueRow sid={sid} problem={problem} item={itemFor(problem.id)} today={today} />
            </Fragment>
          )
        })}
      </SortableContext>
      {ids.length === 0 && <li className="px-4 py-3 text-center text-[13px] text-muted-foreground">Drop it here to keep it for today</li>}
    </ul>
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
