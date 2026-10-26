import type { TrackerData } from '@/types'

/** A fresh start: no progress, the default routine. Also what `normalize()` falls back to field by field. */
export const TRACKER_DEFAULTS: TrackerData = {
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
