import { problemById } from '@/data/problems'
import type { PlanItem } from '@/types'
import { DoneRow } from './DoneRow'
import { Fold } from './Fold'

/** What's finished today, below the queue, folded away with a click once it gets long. */
export function DoneToday({ items, today }: { items: PlanItem[]; today: string }) {
  if (items.length === 0) return null
  return (
    <Fold title="Done today" count={items.length}>
      <ul aria-label="Done today" className="mt-2 divide-y overflow-hidden rounded-xl bg-card ring-1 ring-border">
        {items.map((item) => {
          const problem = problemById.get(item.id)
          return problem ? <DoneRow key={item.id} problem={problem} item={item} today={today} /> : null
        })}
      </ul>
    </Fold>
  )
}
