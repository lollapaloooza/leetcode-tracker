import { ResultLabel } from '@/components/problem-bits'
import type { Problem } from '@/data/problems'
import { TARGET_MINUTES } from '@/lib/_consts/practice'
import { formatRelative } from '@/lib/_utils/date'
import type { PlanItem } from '@/types'
import { DoneMark } from './DoneMark'
import { PlanRow } from './PlanRow'
import { useTodayRow } from './useTodayRow'

/** A problem finished today: how it went, against its time box, and when it comes back. Edit and undo live on its mark. */
export function DoneRow({ problem, item, today }: { problem: Problem; item: PlanItem; today: string }) {
  const { attempt, review } = useTodayRow(problem, item)
  const minutes = attempt?.seconds != null ? Math.max(1, Math.round(attempt.seconds / 60)) : null

  return (
    <PlanRow
      problem={problem}
      leading={<DoneMark problem={problem} attempt={attempt} today={today} />}
      meta={
        attempt ? (
          <>
            <ResultLabel result={attempt.result} />
            {minutes !== null && ` · ${minutes} of ${TARGET_MINUTES[problem.difficulty]} min`}
            {` · ${review?.due ? `review ${formatRelative(review.due, today)}` : 'mastered'}`}
          </>
        ) : (
          'Marked solved'
        )
      }
      muted
    />
  )
}
