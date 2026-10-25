import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { PROBLEMS, type Topic } from '@/data/problems'
import { addDays, isWeekend, localDate } from '@/lib/date'
import type { InterviewTarget } from '@/lib/insights'
import { initialReview, isDue, nextReview, spreadOverdue, type Confidence, type Result, type ReviewState } from '@/lib/srs'

export type Status = 'todo' | 'attempted' | 'solved' | 'helped'

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'Not started',
  attempted: 'Attempted',
  solved: 'Solved',
  helped: 'Solved with help',
}

export const isSolved = (s: Status | undefined) => s === 'solved' || s === 'helped'

export interface ProblemProgress {
  status: Status
  /** ISO timestamp of the last status change */
  updatedAt: string
}

export interface PlanItem {
  id: number
  done: boolean
  /** Key of the attempt that completed this item, if it was logged */
  attempt?: string
}

export interface Attempt {
  key: string
  id: number
  /** Local date the attempt was logged */
  date: string
  at: string
  /** null when untimed */
  seconds: number | null
  result: Result
  confidence: Confidence
  /** What changed, so the attempt can be undone */
  prev: { status?: Status; review?: ReviewState; planned: boolean; done: boolean }
}

export interface TimerState {
  id: number
  /** Epoch ms when the current running stretch began; null while paused */
  startedAt: number | null
  /** ms accumulated before the current stretch */
  elapsed: number
}

/** Big-O for a problem's solution, as typed — e.g. "O(n log n)" */
export interface Complexity {
  time: string
  space: string
}

/** "Watch the solution, write the key idea" — practice that counts, without marking the problem solved */
export interface Study {
  key: string
  id: number
  date: string
  at: string
}

export interface TrackerData {
  progress: Record<number, ProblemProgress>
  /** Day plans keyed by local date (YYYY-MM-DD); past days are kept as history */
  plans: Record<string, PlanItem[]>
  /** Problems to plan on a weekday / on a weekend day */
  weekdayGoal: number
  weekendGoal: number
  /** Practice days per week that make a good week (and keep the streak going) */
  weeklyDays: number
  /** Suggest from the core NeetCode 150 before the other 100 */
  coreFirst: boolean
  attempts: Attempt[]
  studies: Study[]
  reviews: Record<number, ReviewState>
  /** One-line key idea per problem — the pattern cheat sheet */
  notes: Record<number, string>
  complexity: Record<number, Complexity>
  interview: InterviewTarget | null
  timer: TimerState | null
  /** Day the welcome-back prompt was last handled */
  comebackAt: string | null
}

export type GoalKind = 'weekdayGoal' | 'weekendGoal' | 'weeklyDays'

export const GOAL_LIMITS: Record<GoalKind, [min: number, max: number]> = {
  weekdayGoal: [1, 10],
  weekendGoal: [1, 10],
  weeklyDays: [1, 7],
}

export interface AttemptInput {
  seconds: number | null
  result: Result
  confidence: Confidence
  note: string
  time: string
  space: string
}

interface TrackerActions {
  setStatus: (id: number, status: Status, today: string) => void
  logAttempt: (id: number, input: AttemptInput, today: string) => void
  undoAttempt: (key: string) => void
  markUndone: (id: number, today: string) => void
  setNote: (id: number, note: string) => void
  addToPlan: (ids: number[], today: string) => void
  removeFromPlan: (id: number, today: string) => void
  /** Put these problems first on that day, in this order (the rest keep their order after them) */
  reorderPlan: (date: string, ids: number[]) => void
  /** Postpone (or pull forward) an unfinished problem to another day's list */
  moveToDay: (id: number, from: string, to: string) => void
  setGoal: (kind: GoalKind, value: number) => void
  setCoreFirst: (on: boolean) => void
  logStudy: (id: number, note: string, today: string) => void
  /** Restart small after time away: rebase the pace, spread overdue reviews, plan one easy win */
  comeback: (today: string, restartId: number | null) => void
  dismissComeback: (today: string) => void
  setInterview: (date: string | null, today: string) => void
  startTimer: (id: number, today: string) => void
  pauseTimer: () => void
  resumeTimer: () => void
  cancelTimer: () => void
  importData: (data: unknown) => void
}

export type TrackerState = TrackerData & TrackerActions

const DEFAULTS: TrackerData = {
  progress: {},
  plans: {},
  weekdayGoal: 1,
  weekendGoal: 3,
  weeklyDays: 4,
  coreFirst: true,
  attempts: [],
  studies: [],
  reviews: {},
  notes: {},
  complexity: {},
  interview: null,
  timer: null,
  comebackAt: null,
}

const now = () => new Date().toISOString()

export const timerElapsed = (t: TimerState, at: number) =>
  t.elapsed + (t.startedAt === null ? 0 : Math.max(0, at - t.startedAt))

const byId = new Map(PROBLEMS.map((p) => [p.id, p]))
const CORE_FIRST = [...PROBLEMS.filter((p) => p.core), ...PROBLEMS.filter((p) => !p.core)]

/** NeetCode order, optionally with the core 150 pulled ahead of the other 100. */
export const problemOrder = (coreFirst: boolean) => (coreFirst ? CORE_FIRST : PROBLEMS)

/** How many problems to plan on a given day. */
export const goalFor = (s: Pick<TrackerData, 'weekdayGoal' | 'weekendGoal'>, date: string) =>
  isWeekend(date) ? s.weekendGoal : s.weekdayGoal

const solvedCount = (progress: TrackerData['progress']) =>
  PROBLEMS.reduce((n, p) => n + (isSolved(progress[p.id]?.status) ? 1 : 0), 0)

/** A logged attempt can raise a status but never lower it — reviews track regressions instead. */
function statusAfter(current: Status | undefined, result: Result): Status {
  if (result === 'solved') return 'solved'
  if (result === 'helped') return current === 'solved' ? 'solved' : 'helped'
  return isSolved(current) ? current! : 'attempted'
}

function withPlanItem(plans: TrackerData['plans'], day: string, id: number, patch: Partial<PlanItem> | null) {
  const plan = plans[day] ?? []
  const exists = plan.some((p) => p.id === id)
  let next: PlanItem[]
  if (patch === null) next = plan.filter((p) => p.id !== id)
  else if (exists) next = plan.map((p) => (p.id === id ? { ...p, ...patch } : p))
  else next = [...plan, { id, done: false, ...patch }]
  return { ...plans, [day]: next }
}

function omit<T>(record: Record<number, T>, id: number): Record<number, T> {
  const next = { ...record }
  delete next[id]
  return next
}

/** Fill in fields added after v1 so old saves and backups keep working. */
export function normalize(raw: Partial<TrackerData>): TrackerData {
  const data: TrackerData = { ...DEFAULTS, ...raw, timer: raw.timer ?? null }
  // v2 had one daily goal; v3 plans weekdays and weekends separately (defaults: 1 and 3).
  delete (data as TrackerData & { dailyGoal?: number }).dailyGoal
  if (!raw.reviews) {
    const reviews: Record<number, ReviewState> = {}
    for (const [id, p] of Object.entries(data.progress)) {
      if (isSolved(p.status)) reviews[Number(id)] = initialReview(p.status === 'solved' ? 'solved' : 'helped', localDate(new Date(p.updatedAt)))
    }
    data.reviews = reviews
  }
  return data
}

export const useTracker = create<TrackerState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setStatus: (id, status, today) =>
        set((s) => {
          const item = s.plans[today]?.find((p) => p.id === id)
          const solved = isSolved(status)
          return {
            progress: { ...s.progress, [id]: { status, updatedAt: now() } },
            // Marked solved by hand: start its review schedule. Un-solved: drop it.
            reviews: solved
              ? s.reviews[id]
                ? s.reviews
                : { ...s.reviews, [id]: initialReview(status === 'solved' ? 'solved' : 'helped', today) }
              : omit(s.reviews, id),
            // Keep today's checklist in step, unless a logged attempt owns that item.
            plans: item && !item.attempt ? withPlanItem(s.plans, today, id, { done: solved }) : s.plans,
          }
        }),

      logAttempt: (id, input, today) =>
        set((s) => {
          const item = s.plans[today]?.find((p) => p.id === id)
          const key = `${id}-${Date.now()}`
          const attempt: Attempt = {
            key,
            id,
            date: today,
            at: now(),
            seconds: input.seconds,
            result: input.result,
            confidence: input.confidence,
            prev: { status: s.progress[id]?.status, review: s.reviews[id], planned: Boolean(item), done: item?.done ?? false },
          }
          const note = input.note.trim()
          const time = input.time.trim()
          const space = input.space.trim()
          return {
            attempts: [...s.attempts, attempt],
            progress: { ...s.progress, [id]: { status: statusAfter(s.progress[id]?.status, input.result), updatedAt: attempt.at } },
            reviews: { ...s.reviews, [id]: nextReview(s.reviews[id], input.result, input.confidence, today) },
            notes: note ? { ...s.notes, [id]: note } : omit(s.notes, id),
            complexity: time || space ? { ...s.complexity, [id]: { time, space } } : omit(s.complexity, id),
            plans: withPlanItem(s.plans, today, id, { done: true, attempt: key }),
            timer: s.timer?.id === id ? null : s.timer,
          }
        }),

      undoAttempt: (key) =>
        set((s) => {
          const attempt = s.attempts.find((a) => a.key === key)
          if (!attempt) return s
          const { id, prev, date } = attempt
          return {
            attempts: s.attempts.filter((a) => a.key !== key),
            progress: prev.status ? { ...s.progress, [id]: { status: prev.status, updatedAt: now() } } : omit(s.progress, id),
            reviews: prev.review ? { ...s.reviews, [id]: prev.review } : omit(s.reviews, id),
            plans: withPlanItem(s.plans, date, id, prev.planned ? { done: prev.done, attempt: undefined } : null),
          }
        }),

      markUndone: (id, today) => set((s) => ({ plans: withPlanItem(s.plans, today, id, { done: false }) })),

      setNote: (id, note) =>
        set((s) => ({ notes: note.trim() ? { ...s.notes, [id]: note.trim() } : omit(s.notes, id) })),

      addToPlan: (ids, today) =>
        set((s) => {
          const plan = s.plans[today] ?? []
          const fresh = ids.filter((id) => !plan.some((p) => p.id === id))
          if (fresh.length === 0) return s
          return { plans: { ...s.plans, [today]: [...plan, ...fresh.map((id) => ({ id, done: false }))] } }
        }),

      removeFromPlan: (id, today) =>
        set((s) => ({
          plans: withPlanItem(s.plans, today, id, null),
          timer: s.timer?.id === id ? null : s.timer,
        })),

      reorderPlan: (date, ids) =>
        set((s) => {
          const plan = s.plans[date] ?? []
          const first = ids.flatMap((id) => plan.filter((p) => p.id === id))
          return { plans: { ...s.plans, [date]: [...first, ...plan.filter((p) => !ids.includes(p.id))] } }
        }),

      moveToDay: (id, from, to) =>
        set((s) => {
          if (from === to) return s
          const removed = withPlanItem(s.plans, from, id, null)
          return {
            plans: removed[to]?.some((p) => p.id === id) ? removed : withPlanItem(removed, to, id, {}),
            timer: s.timer?.id === id ? null : s.timer,
          }
        }),

      setGoal: (kind, value) => {
        const [min, max] = GOAL_LIMITS[kind]
        set({ [kind]: Math.min(max, Math.max(min, value)) })
      },

      setCoreFirst: (coreFirst) => set({ coreFirst }),

      logStudy: (id, note, today) =>
        set((s) => {
          const tomorrow = addDays(today, 1)
          const text = note.trim()
          return {
            studies: [...s.studies, { key: `study-${id}-${Date.now()}`, id, date: today, at: now() }],
            notes: text ? { ...s.notes, [id]: text } : s.notes,
            // Watched it tonight — solve it yourself tomorrow while it's fresh.
            plans: s.plans[tomorrow]?.some((p) => p.id === id) ? s.plans : withPlanItem(s.plans, tomorrow, id, {}),
          }
        }),

      comeback: (today, restartId) =>
        set((s) => ({
          comebackAt: today,
          reviews: spreadOverdue(s.reviews, today),
          interview:
            s.interview && s.interview.date > today
              ? { ...s.interview, setOn: today, solvedAtSet: solvedCount(s.progress) }
              : s.interview,
          plans:
            restartId === null || s.plans[today]?.some((p) => p.id === restartId)
              ? s.plans
              : withPlanItem(s.plans, today, restartId, {}),
        })),

      dismissComeback: (today) => set({ comebackAt: today }),

      setInterview: (date, today) =>
        set((s) => ({ interview: date ? { date, setOn: today, solvedAtSet: solvedCount(s.progress) } : null })),

      startTimer: (id, today) =>
        set((s) => ({
          timer: { id, startedAt: Date.now(), elapsed: 0 },
          plans: s.plans[today]?.some((p) => p.id === id) ? s.plans : withPlanItem(s.plans, today, id, {}),
        })),

      pauseTimer: () =>
        set((s) => (s.timer?.startedAt ? { timer: { ...s.timer, startedAt: null, elapsed: timerElapsed(s.timer, Date.now()) } } : s)),

      resumeTimer: () => set((s) => (s.timer && s.timer.startedAt === null ? { timer: { ...s.timer, startedAt: Date.now() } } : s)),

      cancelTimer: () => set({ timer: null }),

      importData: (data) => set(normalize(data as Partial<TrackerData>)),
    }),
    {
      name: 'leetcode-tracker',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): TrackerData => ({ ...exportable(s), timer: s.timer }),
      migrate: (persisted) => normalize(persisted as Partial<TrackerData>),
    },
  ),
)

/** Everything worth backing up (a running timer isn't). */
export function exportable(s: TrackerData): Omit<TrackerData, 'timer'> {
  const { progress, plans, weekdayGoal, weekendGoal, weeklyDays, coreFirst, attempts, studies, reviews, notes, complexity, interview, comebackAt } = s
  return { progress, plans, weekdayGoal, weekendGoal, weeklyDays, coreFirst, attempts, studies, reviews, notes, complexity, interview, comebackAt }
}

export function isTrackerData(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.progress === 'object' && v.progress !== null &&
    typeof v.plans === 'object' && v.plans !== null
  )
}

/** Everything planned from `date` on — so suggestions don't pick a problem that's already waiting on a later day. */
export function plannedFrom(plans: TrackerData['plans'], date: string): PlanItem[] {
  return Object.entries(plans).flatMap(([day, plan]) => (day >= date ? plan : []))
}

/** Problems whose review is due today or earlier, oldest first. */
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
  today: string,
): number[] {
  const taken = new Set(planned.map((p) => p.id))
  const picks = dueReviews(s.reviews, today).filter((id) => !taken.has(id)).slice(0, count)
  for (const p of problemOrder(s.coreFirst)) {
    if (picks.length >= count) break
    if (!taken.has(p.id) && !picks.includes(p.id) && !isSolved(s.progress[p.id]?.status)) picks.push(p.id)
  }
  return picks
}

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
  const lastTouched = (id: number) => s.attempts.findLast((a) => a.id === id)?.date ?? ''
  return pool.sort((a, b) => lastTouched(a.id).localeCompare(lastTouched(b.id)))[0]?.id ?? null
}

const lastTouched = (attempts: Attempt[], id: number) => attempts.findLast((a) => a.id === id)?.date ?? ''

/**
 * A ~20-minute task for a low-energy day: a due review (easiest first), else a quick re-solve of
 * an Easy you've solved before (the one you touched longest ago).
 */
export function quickReview(
  s: Pick<TrackerData, 'progress' | 'reviews' | 'attempts' | 'plans'>,
  today: string,
): { id: number; reason: string } | null {
  const planned = new Set((s.plans[today] ?? []).map((p) => p.id))
  const rank = { Easy: 0, Medium: 1, Hard: 2 }
  const due = dueReviews(s.reviews, today)
    .map((id) => byId.get(id))
    .filter((p): p is (typeof PROBLEMS)[number] => p !== undefined && p.difficulty !== 'Hard' && !planned.has(p.id))
    .sort((a, b) => rank[a.difficulty] - rank[b.difficulty])
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

