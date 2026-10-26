import { useMemo } from 'react'
import { dueReviews, leftovers, reviewsThatFit } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import type { PlanItem } from '@/types'

/** Reviews that are due but not planned, and yesterday's leftovers — each with a one-click way to add them. */
export function useTodayNotices(today: string, plan: PlanItem[], goal: number) {
  const reviews = useTracker((s) => s.reviews)
  const plans = useTracker((s) => s.plans)
  const addToPlan = useTracker((s) => s.addToPlan)

  const due = useMemo(() => dueReviews(reviews, today).filter((id) => !plan.some((p) => p.id === id)), [reviews, plan, today])
  const fit = reviewsThatFit(due, plan.length, goal)
  const carryOver = useMemo(() => leftovers(plans, today), [plans, today])

  return {
    reviews: due.length > 0 ? { due: due.length, fitting: fit.length, add: () => addToPlan(fit, today) } : null,
    carryOver: carryOver && { date: carryOver.date, count: carryOver.ids.length, add: () => addToPlan(carryOver.ids, today) },
  }
}

export type ReviewsNotice = NonNullable<ReturnType<typeof useTodayNotices>['reviews']>
