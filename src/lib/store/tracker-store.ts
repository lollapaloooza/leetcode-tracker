import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { TRACKER_DEFAULTS } from '@/lib/_consts/defaults'
import { GOAL_LIMITS } from '@/lib/_consts/practice'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import { addDays } from '@/lib/_utils/date'
import {
  initialReview,
  isSolved,
  nextReview,
  plannedFrom,
  solvedCount,
  spreadOverdue,
  statusAfter,
  suggestionCount,
  suggestNext,
  timerElapsed,
} from '@/lib/domain'
import type { Attempt, AttemptInput, GoalKind, PlanItem, Status, TimerState, TrackerData } from '@/types'
import { exportable, normalize, STORAGE_VERSION } from './persistence'

interface TrackerActions {
  setStatus: (id: number, status: Status, today: string) => void
  logAttempt: (id: number, input: AttemptInput, today: string) => void
  undoAttempt: (key: string) => void
  markUndone: (id: number, today: string) => void
  setNote: (id: number, note: string) => void
  /** Plan these problems on a day (taking them off the backlog) */
  addToPlan: (ids: number[], today: string) => void
  /** Take a problem off a day's plan. Unless it was finished, it goes to the top of the backlog. */
  removeFromPlan: (id: number, day: string) => void
  /** Undo a removal: back into that day's plan at `index`, and off the backlog */
  putBack: (id: number, day: string, index: number) => void
  /** Drop a problem from the backlog; `addToBacklog` with its old index undoes it */
  removeFromBacklog: (id: number) => void
  addToBacklog: (id: number, index?: number) => void
  /** Put these problems first on that day, in this order (the rest keep their order after them) */
  reorderPlan: (date: string, ids: number[]) => void
  /** Postpone (or pull forward) an unfinished problem to another day's list */
  moveToDay: (id: number, from: string, to: string) => void
  /** Plan `date` toward its goal (at least one more): due reviews first, then the next new problems */
  suggestForDay: (date: string, today: string) => void
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
  /** Undo a stopped timer: put it back, unless another one has started since */
  restoreTimer: (timer: TimerState) => void
  importData: (data: unknown) => void
}

export type TrackerState = TrackerData & TrackerActions

const now = () => new Date().toISOString()

function withPlanItem(plans: TrackerData['plans'], day: string, id: number, patch: Partial<PlanItem> | null) {
  const plan = plans[day] ?? []
  const exists = plan.some((p) => p.id === id)
  let next: PlanItem[]
  if (patch === null) next = plan.filter((p) => p.id !== id)
  else if (exists) next = plan.map((p) => (p.id === id ? { ...p, ...patch } : p))
  else next = [...plan, { id, done: false, ...patch }]
  return { ...plans, [day]: next }
}

/** Planning a problem takes it off the backlog. Returns the same array when nothing changes. */
function offBacklog(backlog: number[], ...ids: number[]) {
  return backlog.some((id) => ids.includes(id)) ? backlog.filter((id) => !ids.includes(id)) : backlog
}

function insertAt<T>(items: T[], index: number, item: T) {
  const next = [...items]
  next.splice(Math.max(0, Math.min(index, next.length)), 0, item)
  return next
}

function omit<T>(record: Record<number, T>, id: number): Record<number, T> {
  const next = { ...record }
  delete next[id]
  return next
}

export const useTracker = create<TrackerState>()(
  persist(
    (set, get) => ({
      ...TRACKER_DEFAULTS,

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
            backlog: offBacklog(s.backlog, id),
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
          return {
            plans: { ...s.plans, [today]: [...plan, ...fresh.map((id) => ({ id, done: false }))] },
            backlog: offBacklog(s.backlog, ...fresh),
          }
        }),

      removeFromPlan: (id, day) =>
        set((s) => {
          const item = s.plans[day]?.find((p) => p.id === id)
          if (!item) return s
          return {
            plans: withPlanItem(s.plans, day, id, null),
            backlog: item.done ? s.backlog : [id, ...offBacklog(s.backlog, id)],
            timer: s.timer?.id === id ? null : s.timer,
          }
        }),

      putBack: (id, day, index) =>
        set((s) => {
          const plan = s.plans[day] ?? []
          return {
            plans: plan.some((p) => p.id === id) ? s.plans : { ...s.plans, [day]: insertAt(plan, index, { id, done: false }) },
            backlog: offBacklog(s.backlog, id),
          }
        }),

      removeFromBacklog: (id) => set((s) => ({ backlog: offBacklog(s.backlog, id) })),

      addToBacklog: (id, index = 0) => set((s) => ({ backlog: insertAt(offBacklog(s.backlog, id), index, id) })),

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
            backlog: offBacklog(s.backlog, id),
            timer: s.timer?.id === id ? null : s.timer,
          }
        }),

      suggestForDay: (date, today) => {
        const s = get()
        s.addToPlan(suggestNext(s, plannedFrom(s.plans, today), suggestionCount(s, date), date), date)
      },

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
            backlog: offBacklog(s.backlog, id),
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
          backlog: restartId === null ? s.backlog : offBacklog(s.backlog, restartId),
        })),

      dismissComeback: (today) => set({ comebackAt: today }),

      setInterview: (date, today) =>
        set((s) => ({ interview: date ? { date, setOn: today, solvedAtSet: solvedCount(s.progress) } : null })),

      startTimer: (id, today) =>
        set((s) => ({
          timer: { id, startedAt: Date.now(), elapsed: 0 },
          plans: s.plans[today]?.some((p) => p.id === id) ? s.plans : withPlanItem(s.plans, today, id, {}),
          backlog: offBacklog(s.backlog, id),
        })),

      pauseTimer: () =>
        set((s) => (s.timer?.startedAt ? { timer: { ...s.timer, startedAt: null, elapsed: timerElapsed(s.timer, Date.now()) } } : s)),

      resumeTimer: () => set((s) => (s.timer && s.timer.startedAt === null ? { timer: { ...s.timer, startedAt: Date.now() } } : s)),

      cancelTimer: () => set({ timer: null }),

      restoreTimer: (timer) => set((s) => (s.timer ? s : { timer })),

      importData: (data) => set(normalize(data)),
    }),
    {
      name: STORAGE_KEYS.tracker,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): TrackerData => ({ ...exportable(s), timer: s.timer }),
      // Every load is checked, not only version upgrades: a bad save loses its bad entries, not the app.
      migrate: (persisted) => normalize(persisted),
      merge: (persisted, current) => ({ ...current, ...normalize(persisted) }),
    },
  ),
)
