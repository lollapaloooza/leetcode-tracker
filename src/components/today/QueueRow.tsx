import { RotateCcwIcon } from 'lucide-react'
import { StartButton } from '@/components/timer/StartButton'
import type { Problem } from '@/data/problems'
import { useTracker } from '@/lib/store'
import type { PlanItem } from '@/types'
import { LogCircle } from './LogCircle'
import { PlanRow } from './PlanRow'
import { queueActions } from './today-actions'
import { useSortableRow } from './useSortableRow'
import { useTodayRow } from './useTodayRow'

interface QueueRowProps {
  sid: string
  problem: Problem
  item: PlanItem
  today: string
  /** Offer "Do first" — not for the problem already right after the one being timed */
  canDoFirst: boolean
}

/** A problem still to do today: drag it, log it, start it; everything else is in ⋯. */
export function QueueRow({ sid, problem, item, today, canDoFirst }: QueueRowProps) {
  const sortable = useSortableRow(sid)
  const { isReview } = useTodayRow(problem, item)
  const canStart = useTracker((s) => s.timer === null)

  return (
    <PlanRow
      problem={problem}
      sortable={sortable}
      leading={<LogCircle problem={problem} />}
      meta={
        <>
          {problem.topic} <span aria-hidden>·</span>{' '}
          {isReview ? (
            <span className="inline-flex items-center gap-1 font-medium text-link">
              <RotateCcwIcon className="size-3" /> Review
            </span>
          ) : (
            'New'
          )}
        </>
      }
      // On phones, Start is in ⋯ so the row stays one line.
      trailing={<StartButton problem={problem} today={today} className="max-sm:hidden" />}
      actions={queueActions(problem, today, { canStart, canDoFirst })}
    />
  )
}
