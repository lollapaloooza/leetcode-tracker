import { RotateCcwIcon } from 'lucide-react'
import { StartButton } from '@/components/timer/StartButton'
import type { Problem } from '@/data/problems'
import type { PlanItem } from '@/types'
import { LogCircle } from './LogCircle'
import { removeFromDay } from './plan-actions'
import { PlanRow } from './PlanRow'
import { useSortableRow } from './useSortableRow'
import { useTodayRow } from './useTodayRow'

interface QueueRowProps {
  sid: string
  problem: Problem
  item: PlanItem
  today: string
}

/** A problem still to do today: drag it, log it, start it, or set it aside in the backlog. */
export function QueueRow({ sid, problem, item, today }: QueueRowProps) {
  const sortable = useSortableRow(sid)
  const { isReview } = useTodayRow(problem, item)

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
      trailing={<StartButton problem={problem} today={today} />}
      remove={{ label: `Remove ${problem.title} from today`, onRemove: () => removeFromDay(problem, today) }}
    />
  )
}
