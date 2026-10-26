import { GOAL_LIMITS } from '@/lib/_consts/practice'
import { useTracker } from '@/lib/store'
import type { GoalKind } from '@/types'

/** A routine goal, and steps up and down that stay inside its limits. */
export function useGoal(kind: GoalKind) {
  const value = useTracker((s) => s[kind])
  const setGoal = useTracker((s) => s.setGoal)
  const [min, max] = GOAL_LIMITS[kind]
  return {
    value,
    canDecrease: value > min,
    canIncrease: value < max,
    decrease: () => setGoal(kind, value - 1),
    increase: () => setGoal(kind, value + 1),
  }
}
