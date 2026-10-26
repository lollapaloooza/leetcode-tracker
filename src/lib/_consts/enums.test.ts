import { describe, expect, it } from 'vitest'
import { CONFIDENCES, DIFFICULTIES, RESULTS, STATUSES } from './enums'
import { CONFIDENCE_LABEL, RESULT_LABEL, STATUS_LABEL } from './labels'
import { TARGET_MINUTES } from './practice'

// The `Record<Union, …>` maps are exhaustive by type; the lists aren't. A value missing from a list
// would be dropped by `normalize()` on every load, so check each list against its exhaustive map.
describe('enum lists', () => {
  const sorted = (values: readonly unknown[]) => values.map(String).sort()

  it.each<[string, readonly unknown[], object]>([
    ['STATUSES', STATUSES, STATUS_LABEL],
    ['RESULTS', RESULTS, RESULT_LABEL],
    ['CONFIDENCES', CONFIDENCES, CONFIDENCE_LABEL],
    ['DIFFICULTIES', DIFFICULTIES, TARGET_MINUTES],
  ])('%s lists every value once', (_, list, exhaustive) => {
    expect(new Set(list).size).toBe(list.length)
    expect(sorted(list)).toEqual(sorted(Object.keys(exhaustive)))
  })
})
