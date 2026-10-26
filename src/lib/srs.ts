import type { Confidence, Difficulty, Result, ReviewState } from '@/types'
import { addDays } from './date'

export const RESULT_LABEL: Record<Result, string> = {
  solved: 'Solved',
  helped: 'With help',
  failed: "Didn't solve",
}

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  1: 'Shaky',
  2: 'OK',
  3: 'Solid',
}

/** Interview-style time boxes. */
export const TARGET_MINUTES: Record<Difficulty, number> = {
  Easy: 15,
  Medium: 25,
  Hard: 40,
}

/** Days until the next review after each clean solve: 3 → 7 → 21 → 60, then mastered. */
export const REVIEW_INTERVALS = [3, 7, 21, 60] as const

/**
 * Needing help or failing sends a problem back tomorrow. A clean solve stretches the interval,
 * unless confidence was shaky — then the same interval repeats.
 */
export function nextReview(
  prev: ReviewState | undefined,
  result: Result,
  confidence: Confidence,
  today: string,
): ReviewState {
  if (result !== 'solved') return { step: -1, due: addDays(today, 1) }
  const step = confidence === 1 ? Math.max(prev?.step ?? 0, 0) : prev ? prev.step + 1 : 0
  if (step >= REVIEW_INTERVALS.length) return { step, due: null }
  return { step, due: addDays(today, REVIEW_INTERVALS[step]) }
}

/** Review schedule for a problem marked solved by hand (no logged attempt). */
export function initialReview(result: Exclude<Result, 'failed'>, solvedOn: string): ReviewState {
  return result === 'solved' ? { step: 0, due: addDays(solvedOn, REVIEW_INTERVALS[0]) } : { step: -1, due: addDays(solvedOn, 1) }
}

export function isDue(review: ReviewState | undefined, today: string): boolean {
  return Boolean(review?.due && review.due <= today)
}

/** How a backlog of `count` overdue reviews gets spread: at most 2 a day, over at least two weeks. */
export function spreadSchedule(count: number): { perDay: number; days: number } {
  const perDay = count <= 14 ? 1 : 2
  return { perDay, days: Math.max(14, Math.ceil(count / perDay)) }
}

/**
 * After time away, a pile of overdue reviews is a wall. Spread them from tomorrow, oldest first,
 * keeping each problem's place in its schedule.
 */
export function spreadOverdue(reviews: Record<number, ReviewState>, today: string): Record<number, ReviewState> {
  const overdue = Object.entries(reviews)
    .filter(([, r]) => isDue(r, today))
    .sort(([, a], [, b]) => a.due!.localeCompare(b.due!))
  const { perDay } = spreadSchedule(overdue.length)
  const next = { ...reviews }
  overdue.forEach(([id, r], i) => {
    next[Number(id)] = { ...r, due: addDays(today, 1 + Math.floor(i / perDay)) }
  })
  return next
}

