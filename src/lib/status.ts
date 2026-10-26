import type { Result, Status } from '@/types'

export const STATUSES: readonly Status[] = ['todo', 'attempted', 'solved', 'helped']

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'Not started',
  attempted: 'Attempted',
  solved: 'Solved',
  helped: 'Solved with help',
}

export const isSolved = (s: Status | undefined) => s === 'solved' || s === 'helped'

/** A logged attempt can raise a status but never lower it — reviews track regressions instead. */
export function statusAfter(current: Status | undefined, result: Result): Status {
  if (result === 'solved') return 'solved'
  if (result === 'helped') return current === 'solved' ? 'solved' : 'helped'
  return isSolved(current) ? current! : 'attempted'
}
