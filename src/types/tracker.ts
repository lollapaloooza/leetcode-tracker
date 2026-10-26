// The tracker's domain model: everything that's saved, backed up, and (later) synced.
// Types only — this module has no runtime code and depends on nothing in the app.

export type Status = 'todo' | 'attempted' | 'solved' | 'helped'

/** How an attempt went: on your own, with help (hints, a solution peek), or not at all. */
export type Result = 'solved' | 'helped' | 'failed'
/** 1 = shaky, 2 = OK, 3 = solid */
export type Confidence = 1 | 2 | 3

export interface ProblemProgress {
  status: Status
  /** ISO timestamp of the last status change */
  updatedAt: string
}

export interface ReviewState {
  /** Index into REVIEW_INTERVALS that produced `due`; -1 means relearning (back tomorrow). */
  step: number
  /** Next review date (YYYY-MM-DD), or null once mastered. */
  due: string | null
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

export interface InterviewTarget {
  date: string
  /** When the target was set, and how many were solved then — the start of the pace line. */
  setOn: string
  solvedAtSet: number
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
  /** Problems taken off a plan to come back to later, newest first. Suggest leaves them alone. */
  backlog: number[]
  /** One-line key idea per problem — the pattern cheat sheet */
  notes: Record<number, string>
  complexity: Record<number, Complexity>
  interview: InterviewTarget | null
  timer: TimerState | null
  /** Day the welcome-back prompt was last handled */
  comebackAt: string | null
}

export type GoalKind = 'weekdayGoal' | 'weekendGoal' | 'weeklyDays'

/** What the log-attempt form hands to the store */
export interface AttemptInput {
  seconds: number | null
  result: Result
  confidence: Confidence
  note: string
  time: string
  space: string
}
