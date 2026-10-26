// Builders for unit tests: real problems by title, and attempts/data with sensible defaults.
import { PROBLEMS } from '@/data/problems'
import { TRACKER_DEFAULTS } from '@/lib/_consts/defaults'
import type { Attempt, ProblemProgress, Status, TrackerData } from '@/types'

export function idOf(title: string): number {
  const problem = PROBLEMS.find((p) => p.title === title)
  if (!problem) throw new Error(`No problem titled "${title}"`)
  return problem.id
}

let sequence = 0

/** A solved, 10-minute, "OK"-confidence attempt unless overridden. */
export function attempt(title: string, date: string, overrides: Partial<Attempt> = {}): Attempt {
  const id = idOf(title)
  return {
    key: `${id}-${++sequence}`,
    id,
    date,
    at: `${date}T20:00:00.000Z`,
    seconds: 600,
    result: 'solved',
    confidence: 2,
    prev: { planned: false, done: false },
    ...overrides,
  }
}

/** Progress entries for the given titles, all with one status. */
export function progressOf(status: Status, ...titles: string[]): Record<number, ProblemProgress> {
  return Object.fromEntries(titles.map((t) => [idOf(t), { status, updatedAt: '2026-10-01T12:00:00.000Z' }]))
}

export function tracker(overrides: Partial<TrackerData> = {}): TrackerData {
  return { ...TRACKER_DEFAULTS, ...overrides }
}
