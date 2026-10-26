// Today's plan as you'll work through it: what's on now, what's queued, where the goal ends,
// and how much time is left. Pure functions of the plan, the goal and the timer.
import { problemById } from '@/data/problems'
import { TARGET_MINUTES } from '@/lib/_consts/practice'
import { addDays } from '@/lib/_utils/date'
import type { PlanItem, TimerState, TrackerData } from '@/types'
import { timerElapsed } from './timer'

export interface DayOrder {
  /** Finished today, in plan order */
  done: PlanItem[]
  /** The problem in the spotlight: the one being timed, else the first unfinished one (unless told not to pick) */
  now: number | null
  /** Whether `now` has a timer on it, running or paused */
  timed: boolean
  /** Everything else still to do, in order */
  queue: number[]
  /** Unfinished problems still needed to reach the goal, counting `now` */
  needed: number
  goalMet: boolean
  /** Index in `queue` where the bonus starts; null when the goal is already met or the queue all counts toward it */
  bonusFrom: number | null
}

/**
 * `pickNext: false` leaves the spotlight empty unless a timer runs — after you take a problem out of
 * it, the next one waits in the queue for you to choose it, instead of jumping in.
 */
export function dayOrder(plan: PlanItem[], goal: number, timerId: number | null, pickNext = true): DayOrder {
  const done = plan.filter((p) => p.done)
  const open = plan.filter((p) => !p.done).map((p) => p.id)
  const timed = timerId !== null && open.includes(timerId)
  const now = timed ? timerId : pickNext ? (open[0] ?? null) : null
  const queue = open.filter((id) => id !== now)
  const needed = Math.max(goal - done.length, 0)
  const goalMet = needed === 0
  // `now` counts toward the goal first, then the queue in order.
  const fromQueue = needed - (now !== null ? 1 : 0)
  return { done, now, timed, queue, needed, goalMet, bonusFrom: !goalMet && fromQueue < queue.length ? Math.max(fromQueue, 0) : null }
}

/**
 * Minutes of time box still ahead before the goal is reached: the targets of the problems it needs,
 * less what the clock already has on the one being timed.
 */
export function minutesLeft(order: DayOrder, timer: TimerState | null, at: number): number {
  const ahead = [order.now, ...order.queue].filter((id): id is number => id !== null).slice(0, order.needed)
  const ms = ahead.reduce((sum, id) => {
    const problem = problemById.get(id)
    if (!problem) return sum
    const spent = timer?.id === id ? timerElapsed(timer, at) : 0
    return sum + Math.max(TARGET_MINUTES[problem.difficulty] * 60_000 - spent, 0)
  }, 0)
  return Math.ceil(ms / 60_000)
}

/** Due reviews that fit today: as many as the goal still has room for, and always at least one. */
export function reviewsThatFit(due: number[], planned: number, goal: number): number[] {
  return due.slice(0, Math.max(goal - planned, 1))
}

/**
 * Unfinished problems from yesterday or the day before that aren't on today's list. Older
 * leftovers are guilt, not a plan.
 */
export function leftovers(plans: TrackerData['plans'], today: string): { date: string; ids: number[] } | null {
  const planned = new Set((plans[today] ?? []).map((p) => p.id))
  const previous = Object.keys(plans)
    .filter((d) => d < today && d >= addDays(today, -2) && plans[d].length > 0)
    .sort()
    .at(-1)
  if (!previous) return null
  const ids = plans[previous].filter((p) => !p.done && !planned.has(p.id)).map((p) => p.id)
  return ids.length > 0 ? { date: previous, ids } : null
}

/** Problems put off past tomorrow (like a Hard saved for Saturday), soonest first, so they don't vanish from view. */
export function laterPlans(plans: TrackerData['plans'], today: string): { day: string; id: number }[] {
  const tomorrow = addDays(today, 1)
  return Object.keys(plans)
    .filter((day) => day > tomorrow)
    .sort()
    .flatMap((day) => plans[day].map((item) => ({ day, id: item.id })))
}
