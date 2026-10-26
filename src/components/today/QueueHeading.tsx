import { RotateCcwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReviewsNotice } from './useTodayNotices'

/** "Then" over the queue, with due reviews offered as a quiet link rather than a banner. */
export function QueueHeading({ count, reviews }: { count: number; reviews: ReviewsNotice | null }) {
  if (count === 0 && !reviews) return null
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      {count > 0 && (
        <h2 className="text-sm font-semibold">
          Then <span className="text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
        </h2>
      )}
      {reviews && (
        <p className="ml-auto flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <RotateCcwIcon className="size-3.5 text-link" />
          {reviews.due} {reviews.due === 1 ? 'review' : 'reviews'} due
          <span aria-hidden>·</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-[13px]" onClick={reviews.add}>
            {reviews.fitting === reviews.due ? 'Add to today' : `Add ${reviews.fitting} to today`}
          </Button>
        </p>
      )}
    </div>
  )
}
