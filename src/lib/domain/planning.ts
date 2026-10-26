// What to practice next. Pure functions of the saved data and a date — no store, no clock.
import { PROBLEMS, problemById, type Problem } from '@/data/problems'
import { addDays, isWeekend } from '@/lib/_utils/date'
import type { Attempt, PlanItem, Topic, TrackerData } from '@/types'
import { isDue } from './srs'
import { isSolved } from './status'

const CORE_FIRST = [...PROBLEMS.filter((p) => p.core), ...PROBLEMS.filter((p) => !p.core)]

/** NeetCode order, optionally with the core 150 pulled ahead of the other 100. */
export const problemOrder = (coreFirst: boolean): readonly Problem[] => (coreFirst ? CORE_FIRST : PROBLEMS)

/** How many problems to plan on a given day. */
export const goalFor = (s: Pick<TrackerData, 'weekdayGoal' | 'weekendGoal'>, date: string) =>
  isWeekend(date) ? s.weekendGoal : s.weekdayGoal

export const solvedCount = (progress: TrackerData['progress']) =>
  PROBLEMS.reduce((n, p) => n + (isSolved(progress[p.id]?.status) ? 1 : 0), 0)

/** Everything planned from `date` on — so suggestions don't pick a problem that's already waiting on a later day. */
export function plannedFrom(plans: TrackerData['plans'], date: string): PlanItem[] {
  return Object.entries(plans).flatMap(([day, plan]) => (day >= date ? plan : []))
}

/** Day of the latest attempt at a problem ('' if never attempted), for "longest ago first" ordering. */
export const lastTouched = (attempts: Attempt[], id: number) => attempts.findLast((a) => a.id === id)?.date ?? ''

/** Problems whose review is due on `today` or earlier, oldest first. */
export function dueReviews(reviews: TrackerData['reviews'], today: string): number[] {
  return Object.entries(reviews)
    .filter(([, r]) => isDue(r, today))
    .sort(([, a], [, b]) => a.due!.localeCompare(b.due!))
    .map(([id]) => Number(id))
}

/** Due reviews first (they're what you're about to forget), then the next unsolved in NeetCode order. */
export function suggestNext(
  s: Pick<TrackerData, 'progress' | 'reviews' | 'coreFirst'>,
  planned: PlanItem[],
  count: number,
  date: string,
): number[] {
  const taken = new Set(planned.map((p) => p.id))
  const picks = dueReviews(s.reviews, date).filter((id) => !taken.has(id)).slice(0, count)
  for (const p of problemOrder(s.coreFirst)) {
    if (picks.length >= count) break
    if (!taken.has(p.id) && !picks.includes(p.id) && !isSolved(s.progress[p.id]?.status)) picks.push(p.id)
  }
  return picks
}

/** How many to suggest for a day: enough to reach its goal, and always at least one more. */
export const suggestionCount = (s: Pick<TrackerData, 'plans' | 'weekdayGoal' | 'weekendGoal'>, date: string) =>
  Math.max(goalFor(s, date) - (s.plans[date]?.length ?? 0), 1)

/**
 * One problem to practice a topic: the next unsolved one in NeetCode order, else a due review,
 * else the solved one you touched longest ago.
 */
export function nextInTopic(
  s: Pick<TrackerData, 'progress' | 'reviews' | 'attempts' | 'coreFirst'>,
  topic: Topic,
  planned: PlanItem[],
  today: string,
): number | null {
  const taken = new Set(planned.map((p) => p.id))
  const pool = problemOrder(s.coreFirst).filter((p) => p.topic === topic && !taken.has(p.id))
  const unsolved = pool.find((p) => !isSolved(s.progress[p.id]?.status))
  if (unsolved) return unsolved.id
  const due = pool.find((p) => isDue(s.reviews[p.id], today))
  if (due) return due.id
  return pool.toSorted((a, b) => lastTouched(s.attempts, a.id).localeCompare(lastTouched(s.attempts, b.id)))[0]?.id ?? null
}

const DIFFICULTY_RANK = { Easy: 0, Medium: 1, Hard: 2 }

/**
 * A ~20-minute task for a low-energy day: a due review (easiest first), else a quick re-solve of
 * an Easy you've solved before (the one you touched longest ago).
 */
export function quickReview(
  s: Pick<TrackerData, 'progress' | 'reviews' | 'attempts' | 'plans'>,
  today: string,
): { id: number; reason: string } | null {
  const planned = new Set((s.plans[today] ?? []).map((p) => p.id))
  const due = dueReviews(s.reviews, today)
    .map((id) => problemById.get(id))
    .filter((p): p is Problem => p !== undefined && p.difficulty !== 'Hard' && !planned.has(p.id))
    .sort((a, b) => DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty])
  if (due[0]) return { id: due[0].id, reason: 'Due for review' }
  const easy = PROBLEMS.filter((p) => p.difficulty === 'Easy' && s.progress[p.id]?.status === 'solved' && !planned.has(p.id))
  if (easy.length === 0) return null
  easy.sort((a, b) => lastTouched(s.attempts, a.id).localeCompare(lastTouched(s.attempts, b.id)))
  return { id: easy[0].id, reason: 'Quick re-solve of an Easy you know' }
}

/** Next problem you haven't solved or studied, for "watch & note" (skips today's and tomorrow's plans). */
export function nextToStudy(s: Pick<TrackerData, 'progress' | 'studies' | 'plans' | 'coreFirst'>, today: string): number | null {
  const skip = new Set([...(s.plans[today] ?? []), ...(s.plans[addDays(today, 1)] ?? [])].map((p) => p.id))
  const studied = new Set(s.studies.map((st) => st.id))
  return (
    problemOrder(s.coreFirst).find((p) => !isSolved(s.progress[p.id]?.status) && !studied.has(p.id) && !skip.has(p.id))?.id ??
    null
  )
}

/** Restart with a win: an Easy you solved on your own (longest ago first), else the first unsolved Easy. */
export function restartPick(s: Pick<TrackerData, 'progress' | 'attempts' | 'coreFirst'>): number | null {
  const solvedEasy = PROBLEMS.filter((p) => p.difficulty === 'Easy' && s.progress[p.id]?.status === 'solved')
  if (solvedEasy.length > 0) {
    return solvedEasy.sort((a, b) => lastTouched(s.attempts, a.id).localeCompare(lastTouched(s.attempts, b.id)))[0].id
  }
  return problemOrder(s.coreFirst).find((p) => p.difficulty === 'Easy' && !isSolved(s.progress[p.id]?.status))?.id ?? null
}
