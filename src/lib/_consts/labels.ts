// What the UI calls each value of the domain's union types.
import type { Confidence, Result, Status } from '@/types'

export const STATUS_LABEL: Record<Status, string> = {
  todo: 'Not started',
  attempted: 'Attempted',
  solved: 'Solved',
  helped: 'Solved with help',
}

export const RESULT_LABEL: Record<Result, string> = {
  solved: 'Solved',
  helped: 'With help',
  failed: "Didn't solve",
}

/** 1 = shaky, 2 = OK, 3 = solid */
export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  1: 'Shaky',
  2: 'OK',
  3: 'Solid',
}
