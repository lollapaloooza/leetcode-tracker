import type { Problem } from '@/data/problems'
import { isSolved } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import type { PlanItem } from '@/types'

/** What a Today row knows about its problem: the attempt that finished it, its review, and whether it's a re-solve. */
export function useTodayRow(problem: Problem, item: PlanItem) {
  const status = useTracker((s) => s.progress[problem.id]?.status)
  const review = useTracker((s) => s.reviews[problem.id])
  const attempt = useTracker((s) => (item.attempt ? s.attempts.find((a) => a.key === item.attempt) : undefined))
  // Solved before today's attempt → a review, not a new problem.
  const isReview = attempt ? isSolved(attempt.prev.status) : isSolved(status)
  return { attempt, review, isReview }
}

export type TodayRowFacts = ReturnType<typeof useTodayRow>
