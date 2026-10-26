import { ChevronRightIcon } from 'lucide-react'
import { problemById } from '@/data/problems'
import type { PlanItem } from '@/types'
import { DoneRow } from './DoneRow'

/** What's finished today, below the queue, folded away with a click once it gets long. */
export function DoneToday({ items, today }: { items: PlanItem[]; today: string }) {
  if (items.length === 0) return null
  return (
    <details open className="group/done">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground transition-transform group-open/done:rotate-90" />
        Done today <span className="text-xs font-medium text-muted-foreground tabular-nums">{items.length}</span>
      </summary>
      <ul aria-label="Done today" className="mt-2 divide-y overflow-hidden rounded-xl bg-card ring-1 ring-border">
        {items.map((item) => {
          const problem = problemById.get(item.id)
          return problem ? <DoneRow key={item.id} problem={problem} item={item} today={today} /> : null
        })}
      </ul>
    </details>
  )
}
