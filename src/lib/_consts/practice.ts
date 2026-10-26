// The tunable numbers behind the practice rules.
import type { Difficulty, GoalKind } from '@/types'

/** Interview-style time boxes. */
export const TARGET_MINUTES: Record<Difficulty, number> = {
  Easy: 15,
  Medium: 25,
  Hard: 40,
}

/** Days until the next review after each clean solve: 3 → 7 → 21 → 60, then mastered. */
export const REVIEW_INTERVALS = [3, 7, 21, 60] as const

/** Allowed range of each routine goal (problems a day, practice days a week). */
export const GOAL_LIMITS: Record<GoalKind, [min: number, max: number]> = {
  weekdayGoal: [1, 10],
  weekendGoal: [1, 10],
  weeklyDays: [1, 7],
}
