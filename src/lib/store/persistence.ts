// The saved-data contract: turning whatever comes out of storage or a backup file into a valid
// TrackerData. Bad records are dropped one by one, so a single broken entry can't take the whole
// app down.
import { TRACKER_DEFAULTS } from '@/lib/_consts/defaults'
import { CONFIDENCES, RESULTS, STATUSES } from '@/lib/_consts/enums'
import { GOAL_LIMITS } from '@/lib/_consts/practice'
import { localDate } from '@/lib/_utils/date'
import { initialReview, isSolved, solvedCount } from '@/lib/domain'
import type {
  Attempt,
  Complexity,
  GoalKind,
  InterviewTarget,
  PlanItem,
  ProblemProgress,
  ReviewState,
  Study,
  TimerState,
  TrackerData,
} from '@/types'

/** Version of the saved shape. Bump it, and teach `normalize()` the old shape, whenever the shape changes. */
export const STORAGE_VERSION = 3

type Guard<T> = (v: unknown) => v is T

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const isString = (v: unknown): v is string => typeof v === 'string'
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isInt = (v: unknown): v is number => Number.isInteger(v)
const isBool = (v: unknown): v is boolean => typeof v === 'boolean'
const isDay = (v: unknown): v is string => isString(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)
const oneOf =
  <T>(values: readonly T[]) =>
  (v: unknown): v is T =>
    values.includes(v as T)

const isStatus = oneOf(STATUSES)
const isResult = oneOf(RESULTS)
const isConfidence = oneOf(CONFIDENCES)

const isProgress = (v: unknown): v is ProblemProgress =>
  isRecord(v) && isStatus(v.status) && isString(v.updatedAt) && !Number.isNaN(Date.parse(v.updatedAt))
const isReview = (v: unknown): v is ReviewState => isRecord(v) && isInt(v.step) && (v.due === null || isDay(v.due))
const isPlanItem = (v: unknown): v is PlanItem =>
  isRecord(v) && isInt(v.id) && isBool(v.done) && (v.attempt === undefined || isString(v.attempt))
const isComplexity = (v: unknown): v is Complexity => isRecord(v) && isString(v.time) && isString(v.space)
const isStudy = (v: unknown): v is Study => isRecord(v) && isString(v.key) && isInt(v.id) && isDay(v.date) && isString(v.at)
const isAttempt = (v: unknown): v is Attempt =>
  isRecord(v) &&
  isString(v.key) &&
  isInt(v.id) &&
  isDay(v.date) &&
  isString(v.at) &&
  (v.seconds === null || (isNumber(v.seconds) && v.seconds >= 0)) &&
  isResult(v.result) &&
  isConfidence(v.confidence) &&
  isRecord(v.prev) &&
  isBool(v.prev.planned) &&
  isBool(v.prev.done) &&
  (v.prev.status === undefined || isStatus(v.prev.status)) &&
  (v.prev.review === undefined || isReview(v.prev.review))
const isInterview = (v: unknown): v is InterviewTarget =>
  isRecord(v) && isDay(v.date) && isDay(v.setOn) && isNumber(v.solvedAtSet)
const isTimer = (v: unknown): v is TimerState =>
  isRecord(v) && isInt(v.id) && (v.startedAt === null || isNumber(v.startedAt)) && isNumber(v.elapsed)

const arrayOf = <T>(v: unknown, guard: Guard<T>): T[] => (Array.isArray(v) ? v.filter(guard) : [])

/** Entries keyed by problem id (JSON object keys are strings) whose values pass the guard. */
function byProblem<T>(v: unknown, guard: Guard<T>): Record<number, T> {
  if (!isRecord(v)) return {}
  const entries = Object.entries(v).filter((e): e is [string, T] => /^\d+$/.test(e[0]) && guard(e[1]))
  return Object.fromEntries(entries.map(([id, value]) => [Number(id), value]))
}

function plansOf(v: unknown): Record<string, PlanItem[]> {
  if (!isRecord(v)) return {}
  return Object.fromEntries(Object.entries(v).flatMap(([day, plan]) => (isDay(day) ? [[day, arrayOf(plan, isPlanItem)]] : [])))
}

function goal(v: unknown, kind: GoalKind): number {
  const [min, max] = GOAL_LIMITS[kind]
  return isInt(v) ? Math.min(max, Math.max(min, v)) : TRACKER_DEFAULTS[kind]
}

/**
 * Any saved state, backup, or older version → valid TrackerData. Missing fields get defaults,
 * invalid entries are dropped, and fields from older versions (v2's `dailyGoal`) fall away.
 */
export function normalize(raw: unknown): TrackerData {
  const r = isRecord(raw) ? raw : {}
  const progress = byProblem(r.progress, isProgress)
  return {
    progress,
    plans: plansOf(r.plans),
    weekdayGoal: goal(r.weekdayGoal, 'weekdayGoal'),
    weekendGoal: goal(r.weekendGoal, 'weekendGoal'),
    weeklyDays: goal(r.weeklyDays, 'weeklyDays'),
    coreFirst: isBool(r.coreFirst) ? r.coreFirst : TRACKER_DEFAULTS.coreFirst,
    attempts: arrayOf(r.attempts, isAttempt),
    studies: arrayOf(r.studies, isStudy),
    // v1 had no reviews: start a schedule for everything already solved.
    reviews: isRecord(r.reviews) ? byProblem(r.reviews, isReview) : backfillReviews(progress),
    notes: byProblem(r.notes, isString),
    complexity: byProblem(r.complexity, isComplexity),
    interview: isInterview(r.interview) ? r.interview : null,
    timer: isTimer(r.timer) ? r.timer : null,
    comebackAt: isDay(r.comebackAt) ? r.comebackAt : null,
  }
}

function backfillReviews(progress: TrackerData['progress']): TrackerData['reviews'] {
  const reviews: TrackerData['reviews'] = {}
  for (const [id, p] of Object.entries(progress)) {
    if (isSolved(p.status)) reviews[Number(id)] = initialReview(p.status === 'solved' ? 'solved' : 'helped', localDate(new Date(p.updatedAt)))
  }
  return reviews
}

/** Everything worth backing up (a running timer isn't). */
export function exportable(s: TrackerData): Omit<TrackerData, 'timer'> {
  const { progress, plans, weekdayGoal, weekendGoal, weeklyDays, coreFirst, attempts, studies, reviews, notes, complexity, interview, comebackAt } = s
  return { progress, plans, weekdayGoal, weekendGoal, weeklyDays, coreFirst, attempts, studies, reviews, notes, complexity, interview, comebackAt }
}

/** Does a file look like one of our backups at all? (Its contents are still checked by `normalize`.) */
export function isTrackerData(value: unknown): boolean {
  return isRecord(value) && isRecord(value.progress) && isRecord(value.plans)
}

export type BackupParse = { ok: true; data: TrackerData } | { ok: false; reason: 'not-json' | 'not-a-backup' }

/** A backup file's text as valid data, or why it can't be imported. */
export function parseBackup(text: string): BackupParse {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'not-json' }
  }
  return isTrackerData(raw) ? { ok: true, data: normalize(raw) } : { ok: false, reason: 'not-a-backup' }
}

export interface BackupSummary {
  solved: number
  attempts: number
  notes: number
  /** Day of the latest attempt, or null when none was logged */
  lastPractice: string | null
}

/** What's in a backup, so you can tell it's the right file before replacing anything. */
export function summarizeBackup(data: TrackerData): BackupSummary {
  const lastPractice = data.attempts.reduce<string | null>((last, a) => (last === null || a.date > last ? a.date : last), null)
  return { solved: solvedCount(data.progress), attempts: data.attempts.length, notes: Object.keys(data.notes).length, lastPractice }
}
