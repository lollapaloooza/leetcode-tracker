// Read-only views over your practice: pace, activity, streaks, weak topics.
import { TARGET_MINUTES } from '@/lib/_consts/practice'
import { addDays, diffDays, weekStart } from '@/lib/_utils/date'
import type { Attempt, InterviewTarget, PlanItem, Problem, Study, Topic } from '@/types'

export interface Pace {
  daysLeft: number
  perDay: number
  /** Where a steady pace from `setOn` would put you by today. */
  expected: number
  /** Positive = ahead of pace, negative = behind. */
  delta: number
}

export function computePace(target: InterviewTarget, solved: number, total: number, today: string): Pace {
  const daysLeft = diffDays(today, target.date)
  const remaining = Math.max(total - solved, 0)
  const perDay = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining
  const span = Math.max(diffDays(target.setOn, target.date), 1)
  const elapsed = Math.min(Math.max(diffDays(target.setOn, today), 0), span)
  const start = Math.min(target.solvedAtSet, total)
  const expected = Math.floor(start + ((total - start) * elapsed) / span)
  return { daysLeft, perDay, expected, delta: solved - expected }
}

const wasReview = (a: Attempt) => a.prev.status === 'solved' || a.prev.status === 'helped'
const overTarget = (a: Attempt, p: Problem | undefined) =>
  a.seconds !== null && p !== undefined && a.seconds > TARGET_MINUTES[p.difficulty] * 60

/** Practice per day: logged attempts, study sessions, and problems checked off without a log. */
export function activityByDay(
  attempts: Attempt[],
  plans: Record<string, PlanItem[]>,
  studies: Study[] = [],
): Map<string, number> {
  const counts = new Map<string, number>()
  const bump = (day: string) => counts.set(day, (counts.get(day) ?? 0) + 1)
  for (const a of attempts) bump(a.date)
  for (const st of studies) bump(st.date)
  for (const [day, plan] of Object.entries(plans)) for (const item of plan) if (item.done && !item.attempt) bump(day)
  return counts
}

/** Most recent day with practice before today, or null if there's none. */
export function lastActiveBefore(active: Iterable<string>, today: string): string | null {
  let last: string | null = null
  for (const day of active) if (day < today && (last === null || day > last)) last = day
  return last
}

export interface WeekDay {
  date: string
  active: boolean
  isToday: boolean
  future: boolean
}

/** Mon–Sun of the current week. */
export function currentWeek(active: Set<string>, today: string): WeekDay[] {
  const monday = weekStart(today)
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i)
    return { date, active: active.has(date), isToday: date === today, future: date > today }
  })
}

/**
 * Consecutive weeks that hit the "practice N days" goal. A week still in progress only adds
 * to the streak once it's hit — until then the streak through last week stays alive.
 */
export function weeklyStreak(active: Set<string>, today: string, daysPerWeek: number): { weeks: number; thisWeek: number } {
  const daysIn = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => active.has(d)).length
  const thisMonday = weekStart(today)
  const thisWeek = daysIn(thisMonday)
  let weeks = thisWeek >= daysPerWeek ? 1 : 0
  for (let monday = addDays(thisMonday, -7); daysIn(monday) >= daysPerWeek; monday = addDays(monday, -7)) weeks++
  return { weeks, thisWeek }
}

export interface PeriodSummary {
  attempts: number
  fresh: number
  reviews: number
  /** Median minutes across timed attempts */
  medianMinutes: number | null
  overTarget: number
  activeDays: number
  /** Attempts in the 7 days before, for a trend */
  previousAttempts: number
}

/** The last 7 days (today included) against the 7 before. */
export function lastWeekSummary(attempts: Attempt[], byId: ReadonlyMap<number, Problem>, today: string): PeriodSummary {
  const start = addDays(today, -6)
  const prevStart = addDays(today, -13)
  const recent = attempts.filter((a) => a.date >= start && a.date <= today)
  const timed = recent.filter((a) => a.seconds !== null).map((a) => a.seconds! / 60).sort((x, y) => x - y)
  const mid = Math.floor(timed.length / 2)
  return {
    attempts: recent.length,
    reviews: recent.filter(wasReview).length,
    fresh: recent.filter((a) => !wasReview(a)).length,
    medianMinutes: timed.length === 0 ? null : Math.round(timed.length % 2 ? timed[mid] : (timed[mid - 1] + timed[mid]) / 2),
    overTarget: recent.filter((a) => overTarget(a, byId.get(a.id))).length,
    activeDays: new Set(recent.map((a) => a.date)).size,
    previousAttempts: attempts.filter((a) => a.date >= prevStart && a.date < start).length,
  }
}

export interface TopicFocus {
  topic: Topic
  attempts: number
  /** Needed help or didn't solve */
  struggled: number
  timed: number
  slow: number
  shaky: number
  score: number
  reason: string
}

/**
 * Topics where recent attempts went worst. Struggling counts most, running over the time box
 * next, shaky solves least. Topics with too few attempts aren't judged.
 */
export function weakTopics(
  attempts: Attempt[],
  byId: ReadonlyMap<number, Problem>,
  today: string,
  { days = 60, minAttempts = 2, limit = 3 } = {},
): TopicFocus[] {
  const since = addDays(today, -days)
  const byTopic = new Map<Topic, Attempt[]>()
  for (const a of attempts) {
    const p = byId.get(a.id)
    if (!p || a.date < since) continue
    byTopic.set(p.topic, [...(byTopic.get(p.topic) ?? []), a])
  }

  const focus: TopicFocus[] = []
  for (const [topic, list] of byTopic) {
    if (list.length < minAttempts) continue
    const struggled = list.filter((a) => a.result !== 'solved').length
    const timedList = list.filter((a) => a.seconds !== null)
    const slow = timedList.filter((a) => overTarget(a, byId.get(a.id))).length
    const shaky = list.filter((a) => a.result === 'solved' && a.confidence === 1).length
    const score =
      struggled / list.length + (timedList.length ? (0.5 * slow) / timedList.length : 0) + (0.3 * shaky) / list.length
    if (score === 0) continue
    const reason =
      struggled > 0
        ? `${struggled} of ${list.length} needed help or failed`
        : slow > 0
          ? `${slow} of ${timedList.length} over time`
          : `${shaky} shaky ${shaky === 1 ? 'solve' : 'solves'}`
    focus.push({ topic, attempts: list.length, struggled, timed: timedList.length, slow, shaky, score, reason })
  }
  return focus.sort((a, b) => b.score - a.score || b.attempts - a.attempts).slice(0, limit)
}

