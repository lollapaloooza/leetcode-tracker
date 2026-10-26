import { useMemo } from 'react'
import { addDays } from '@/lib/_utils/date'
import { dayOrder, goalFor } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import type { PlanItem } from '@/types'
import { sortableId } from './board-lists'
import { usePlanBoard } from './usePlanBoard'

const EMPTY: PlanItem[] = []

/**
 * Today's plan in working order — the problem in the spotlight, then the queue — and the board that
 * drags the queue and tomorrow's list. The spotlight problem is pinned: it stays first and doesn't move.
 */
export function useDayPlan(today: string) {
  const tomorrow = addDays(today, 1)
  const plan = useTracker((s) => s.plans[today] ?? EMPTY)
  const tomorrowPlan = useTracker((s) => s.plans[tomorrow] ?? EMPTY)
  const goal = useTracker((s) => goalFor(s, today))
  const timerId = useTracker((s) => s.timer?.id ?? null)

  const order = useMemo(() => dayOrder(plan, goal, timerId), [plan, goal, timerId])
  const lists = useMemo(
    () => ({
      today: order.queue.map((id) => sortableId('today', id)),
      tomorrow: tomorrowPlan.map((p) => sortableId('tomorrow', p.id)),
    }),
    [order.queue, tomorrowPlan],
  )
  const board = usePlanBoard({
    lists,
    dates: { today, tomorrow },
    pinned: { today: order.now !== null ? [order.now] : [], tomorrow: [] },
  })

  return { plan, goal, order, board }
}
